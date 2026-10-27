import { config } from '../../../../config/env.js';
import { logger } from '../../../../utils/logger.js';
import { validateMaskedCallDto } from '../validators/call.validator.js';
import { verifyWebhookSecret } from '../services/exotelWebhook.js';
import {
    CallError,
    requestMaskedCall,
    applyExotelStatusCallback,
    listCallsForOrder,
} from '../services/maskedCall.service.js';

const sendCallError = (res, err) => {
    if (err.extra?.retryAfterSeconds) res.setHeader('Retry-After', String(err.extra.retryAfterSeconds));
    return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message, ...err.extra });
};

/** GET /calls/config — lets the apps hide call buttons when masking is off. */
export function getCallConfigController(_req, res) {
    res.status(200).json({ success: true, data: { enabled: config.callMaskingEnabled } });
}

/** POST /calls/masked — body: { orderId, targetRole }. Response never contains phone numbers. */
export async function requestMaskedCallController(req, res, next) {
    try {
        const dto = validateMaskedCallDto(req.body);
        const result = await requestMaskedCall({
            authUser: { userId: req.user?.userId, role: req.user?.role },
            orderId: dto.orderId,
            targetRole: dto.targetRole,
        });
        return res.status(200).json({ success: true, callLogId: result.callLogId, message: result.message });
    } catch (err) {
        if (err instanceof CallError) return sendCallError(res, err);
        return next(err);
    }
}

/** POST /webhooks/exotel/call-status?secret=... — Exotel status callback (public, secret-protected). */
export async function exotelStatusCallbackController(req, res) {
    const provided = req.query?.secret || req.get('x-exotel-webhook-secret') || '';
    if (!verifyWebhookSecret(String(provided), config.exotelWebhookSecret)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    try {
        const { updated } = await applyExotelStatusCallback(req.body || {});
        return res.status(200).json({ success: true, updated });
    } catch (err) {
        // Still 200 so Exotel does not hammer retries for a record we cannot process.
        logger.error(`[CallMasking] status callback processing failed: ${err.message}`);
        return res.status(200).json({ success: false });
    }
}

/** GET /food/admin/orders/:orderId/calls — admin/support call history (masked numbers only). */
export async function listOrderCallsAdminController(req, res, next) {
    try {
        const data = await listCallsForOrder(req.params.orderId);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        if (err instanceof CallError) return sendCallError(res, err);
        return next(err);
    }
}
