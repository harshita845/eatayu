import mongoose from 'mongoose';
import { config } from '../../../../config/env.js';
import { logger } from '../../../../utils/logger.js';
import { normalizeIndianPhone, maskPhone } from '../../../../utils/phone.js';
import { getExotelClient, ExotelError } from '../../../../services/exotel.service.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { buildOrderIdentityFilter } from '../../orders/services/order.helpers.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodCallLog } from '../models/callLog.model.js';
import { evaluateCallRequest } from './callPolicy.js';
import { createCallAttemptLimiter } from './callRateLimit.js';
import { parseExotelStatusCallback, TERMINAL_CALL_STATUSES } from './exotelWebhook.js';

/** Expected, user-facing call failure (mapped to `{ success:false, code, message }`). */
export class CallError extends Error {
    constructor(code, statusCode, message, extra = {}) {
        super(message);
        this.name = 'CallError';
        this.code = code;
        this.statusCode = statusCode;
        this.extra = extra;
    }
}

const defaultLimiter = createCallAttemptLimiter({
    max: config.callMaskingRateLimitMax,
    windowSeconds: config.callMaskingRateLimitWindowSeconds,
});

const ORDER_FIELDS_FOR_CALLS =
    'userId restaurantId dispatch orderStatus deliveryState statusHistory updatedAt customerPhone deliveryAddress.phone';

/**
 * Real phone number of a party, looked up server-side only.
 * Customers are called on the order's recipient number first (they may order for
 * someone else); when the customer is the caller, Exotel rings their account phone.
 */
async function resolvePartyPhone(role, order, { asCaller }) {
    if (role === 'customer') {
        const user = await FoodUser.findById(order.userId).select('phone').lean();
        const candidates = asCaller
            ? [user?.phone, order.customerPhone, order.deliveryAddress?.phone]
            : [order.deliveryAddress?.phone, order.customerPhone, user?.phone];
        return { userId: order.userId, phone: candidates.map(normalizeIndianPhone).find(Boolean) || null };
    }
    if (role === 'rider') {
        const riderId = order.dispatch?.deliveryPartnerId;
        const rider = riderId ? await FoodDeliveryPartner.findById(riderId).select('phone').lean() : null;
        return { userId: riderId || null, phone: normalizeIndianPhone(rider?.phone) };
    }
    const restaurant = await FoodRestaurant.findById(order.restaurantId).select('primaryContactNumber ownerPhone').lean();
    const phone = [restaurant?.primaryContactNumber, restaurant?.ownerPhone].map(normalizeIndianPhone).find(Boolean) || null;
    return { userId: order.restaurantId, phone };
}

function buildStatusCallbackUrl() {
    const secret = encodeURIComponent(config.exotelWebhookSecret);
    return `${config.publicApiBaseUrl}/api/v1/webhooks/exotel/call-status?secret=${secret}`;
}

/**
 * Starts a masked call from the authenticated user to another party of the order.
 * Never returns or logs real phone numbers.
 * @param {{ authUser: { userId: string, role: string }, orderId: string, targetRole: string }} input
 * @param {{ exotelClient?: object, limiter?: object, now?: Date }} [deps]
 * @returns {Promise<{ callLogId: string, message: string }>}
 */
export async function requestMaskedCall({ authUser, orderId, targetRole }, deps = {}) {
    if (!config.callMaskingEnabled) {
        throw new CallError('CALL_MASKING_DISABLED', 503, 'Calling is not available right now');
    }
    const exotelClient = deps.exotelClient || getExotelClient();
    const limiter = deps.limiter || defaultLimiter;

    const identity = buildOrderIdentityFilter(orderId);
    const order = identity ? await FoodOrder.findOne(identity).select(ORDER_FIELDS_FOR_CALLS).lean() : null;

    const verdict = evaluateCallRequest({
        order,
        authUser,
        targetRole,
        now: deps.now || new Date(),
        postDeliveryMinutes: config.callMaskingPostDeliveryMinutes,
    });
    if (!verdict.ok) throw new CallError(verdict.code, verdict.httpStatus, verdict.message);

    const quota = await limiter.hit(`${verdict.callerRole}:${authUser.userId}`, String(order._id));
    if (!quota.allowed) {
        throw new CallError('RATE_LIMITED', 429, 'Too many call attempts. Please wait a few minutes and try again.', {
            retryAfterSeconds: quota.retryAfterSeconds,
        });
    }

    const [caller, callee] = await Promise.all([
        resolvePartyPhone(verdict.callerRole, order, { asCaller: true }),
        resolvePartyPhone(verdict.calleeRole, order, { asCaller: false }),
    ]);
    if (!caller.phone) {
        throw new CallError('CALLER_PHONE_UNAVAILABLE', 422, 'Add a valid mobile number to your profile to use calling');
    }
    if (!callee.phone) {
        throw new CallError('TARGET_PHONE_UNAVAILABLE', 422, `We can't reach the ${verdict.calleeRole} by phone right now`);
    }

    const callLog = await FoodCallLog.create({
        orderId: order._id,
        callerRole: verdict.callerRole,
        callerUserId: authUser.userId,
        calleeRole: verdict.calleeRole,
        calleeUserId: callee.userId || null,
        callerPhoneMasked: maskPhone(caller.phone),
        calleePhoneMasked: maskPhone(callee.phone),
        status: 'initiated',
    });

    try {
        const result = await exotelClient.connectTwoNumbers({
            from: caller.phone,
            to: callee.phone,
            callerId: config.exotelExophone,
            statusCallback: buildStatusCallbackUrl(),
            customField: String(callLog._id),
            timeLimitSeconds: config.exotelCallTimeLimitSeconds,
            ringTimeoutSeconds: config.exotelRingTimeoutSeconds,
            record: config.exotelRecordCalls,
        });
        await FoodCallLog.updateOne(
            { _id: callLog._id },
            { $set: { exotelCallSid: result.callSid, exotelStatus: result.status, startedAt: new Date() } },
        );
    } catch (err) {
        const safeMessage = err instanceof ExotelError ? err.message : 'Unexpected error while starting the call';
        await FoodCallLog.updateOne({ _id: callLog._id }, { $set: { status: 'failed', errorMessage: safeMessage } });
        logger.error(`[CallMasking] order ${order._id} ${verdict.callerRole}->${verdict.calleeRole} failed: ${safeMessage}`);
        throw new CallError('CALL_FAILED', 502, "We couldn't connect your call. Please try again.");
    }

    logger.info(`[CallMasking] order ${order._id} ${verdict.callerRole}->${verdict.calleeRole} call ${callLog._id} started`);
    return {
        callLogId: String(callLog._id),
        message: 'Connecting your call... you will receive a call from our number shortly. Please pick up.',
    };
}

/**
 * Applies an Exotel status callback to its CallLog. Idempotent: replays are no-ops and
 * a final status is never overwritten by a late non-final one.
 * @returns {Promise<{ updated: boolean }>}
 */
export async function applyExotelStatusCallback(body) {
    const event = parseExotelStatusCallback(body);
    const filter = event.customField && mongoose.Types.ObjectId.isValid(event.customField)
        ? { _id: new mongoose.Types.ObjectId(event.customField) }
        : event.callSid ? { exotelCallSid: event.callSid } : null;
    if (!filter) return { updated: false };

    const existing = await FoodCallLog.findOne(filter).select('status exotelCallSid').lean();
    if (!existing) return { updated: false };

    const incomingIsFinal = TERMINAL_CALL_STATUSES.includes(event.status);
    if (TERMINAL_CALL_STATUSES.includes(existing.status) && !incomingIsFinal) return { updated: false };

    const set = {};
    if (event.status) set.status = event.status;
    if (event.exotelStatus) set.exotelStatus = event.exotelStatus;
    if (event.callSid && !existing.exotelCallSid) set.exotelCallSid = event.callSid;
    if (event.durationSeconds !== null) set.durationSeconds = event.durationSeconds;
    if (event.recordingUrl) set.recordingUrl = event.recordingUrl;
    if (event.startedAt) set.startedAt = event.startedAt;
    if (incomingIsFinal) set.endedAt = event.endedAt || new Date();
    if (!Object.keys(set).length) return { updated: false };

    await FoodCallLog.updateOne({ _id: existing._id }, { $set: set });
    return { updated: true };
}

/** Call history for an order (admin/support). Contains masked numbers only. */
export async function listCallsForOrder(orderId) {
    const identity = buildOrderIdentityFilter(orderId);
    const order = identity ? await FoodOrder.findOne(identity).select('_id').lean() : null;
    if (!order) throw new CallError('ORDER_NOT_FOUND', 404, 'Order not found');
    const calls = await FoodCallLog.find({ orderId: order._id }).sort({ createdAt: -1 }).limit(200).lean();
    return { orderId: String(order._id), calls };
}
