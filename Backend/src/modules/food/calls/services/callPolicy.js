/**
 * Pure authorization + status rules for masked calls (no DB access, unit-tested).
 */

/** Auth token role -> order party role. */
export const PARTY_ROLE_BY_AUTH_ROLE = Object.freeze({
    USER: 'customer',
    DELIVERY_PARTNER: 'rider',
    RESTAURANT: 'restaurant',
});

/** Order statuses in which the parties may call each other. */
export const CALLABLE_ORDER_STATUSES = Object.freeze([
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'reached_pickup',
    'picked_up',
    'reached_drop',
]);

const idOf = (value) => String(value?._id ?? value ?? '');

/** The rider counts as part of the order only once they have accepted it. */
export const getAssignedRiderId = (order) => {
    if (order?.dispatch?.status !== 'accepted') return '';
    return idOf(order?.dispatch?.deliveryPartnerId);
};

/** When the order was delivered (falls back to status history, then updatedAt). */
export const getDeliveredAt = (order) => {
    const direct = order?.deliveryState?.deliveredAt || order?.deliveredAt;
    if (direct) return new Date(direct);
    const entry = [...(order?.statusHistory || [])].reverse().find((h) => h?.to === 'delivered');
    if (entry?.at) return new Date(entry.at);
    return order?.updatedAt ? new Date(order.updatedAt) : null;
};

/** Party role of the authenticated user on this order, or null if they are not part of it. */
export const getCallerPartyRole = (order, authUser) => {
    const role = PARTY_ROLE_BY_AUTH_ROLE[String(authUser?.role || '').toUpperCase()];
    const userId = String(authUser?.userId || '');
    if (!role || !userId || !order) return null;
    if (role === 'customer' && idOf(order.userId) === userId) return 'customer';
    if (role === 'restaurant' && idOf(order.restaurantId) === userId) return 'restaurant';
    if (role === 'rider' && getAssignedRiderId(order) === userId) return 'rider';
    return null;
};

const deny = (code, httpStatus, message) => ({ ok: false, code, httpStatus, message });

/**
 * Decides whether `authUser` may call `targetRole` on `order` at `now`.
 * Non-parties get the same response as a missing order (no IDOR signal).
 * @returns {{ ok: true, callerRole: string, calleeRole: string } |
 *           { ok: false, code: string, httpStatus: number, message: string }}
 */
export const evaluateCallRequest = ({ order, authUser, targetRole, now = new Date(), postDeliveryMinutes = 30 }) => {
    if (!order) return deny('ORDER_NOT_FOUND', 404, 'Order not found');

    const callerRole = getCallerPartyRole(order, authUser);
    if (!callerRole) return deny('ORDER_NOT_FOUND', 404, 'Order not found');

    if (!['customer', 'rider', 'restaurant'].includes(targetRole)) {
        return deny('INVALID_TARGET', 400, 'Invalid call target');
    }
    if (targetRole === callerRole) return deny('INVALID_TARGET', 400, 'You cannot call yourself');

    const status = String(order.orderStatus || '').toLowerCase();
    if (status.startsWith('cancelled')) return deny('ORDER_CANCELLED', 409, 'Calls are not available for cancelled orders');

    if (status === 'delivered') {
        const deliveredAt = getDeliveredAt(order);
        const windowMs = Math.max(0, Number(postDeliveryMinutes) || 0) * 60 * 1000;
        if (!deliveredAt || now.getTime() - deliveredAt.getTime() > windowMs) {
            return deny('CALL_WINDOW_CLOSED', 409, 'Calling is no longer available for this order');
        }
    } else if (!CALLABLE_ORDER_STATUSES.includes(status)) {
        return deny('ORDER_NOT_ACTIVE', 409, 'Calls become available once the restaurant accepts the order');
    }

    if (targetRole === 'rider' && !getAssignedRiderId(order)) {
        return deny('RIDER_NOT_ASSIGNED', 409, 'A delivery partner has not been assigned yet');
    }

    return { ok: true, callerRole, calleeRole: targetRole };
};
