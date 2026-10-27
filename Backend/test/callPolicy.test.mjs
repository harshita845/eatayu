import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCallRequest, getCallerPartyRole } from '../src/modules/food/calls/services/callPolicy.js';

const ids = { user: 'u1', restaurant: 'r1', rider: 'd1', otherRider: 'd2' };
const order = (over = {}) => ({
    userId: ids.user,
    restaurantId: { _id: ids.restaurant },
    orderStatus: 'preparing',
    dispatch: { status: 'accepted', deliveryPartnerId: ids.rider },
    ...over,
});
const customer = { userId: ids.user, role: 'USER' };
const restaurant = { userId: ids.restaurant, role: 'RESTAURANT' };
const rider = { userId: ids.rider, role: 'DELIVERY_PARTNER' };

test('identifies each party of the order', () => {
    assert.equal(getCallerPartyRole(order(), customer), 'customer');
    assert.equal(getCallerPartyRole(order(), restaurant), 'restaurant');
    assert.equal(getCallerPartyRole(order(), rider), 'rider');
});

test('allows every valid pair on an active order', () => {
    for (const [caller, target] of [[customer, 'rider'], [customer, 'restaurant'], [rider, 'customer'], [rider, 'restaurant'], [restaurant, 'rider'], [restaurant, 'customer']]) {
        const v = evaluateCallRequest({ order: order(), authUser: caller, targetRole: target });
        assert.equal(v.ok, true, `${caller.role} -> ${target}`);
    }
});

test('outsiders get "not found" (no IDOR signal)', () => {
    const outsiders = [
        { userId: 'someone-else', role: 'USER' },
        { userId: 'other-restaurant', role: 'RESTAURANT' },
        { userId: ids.otherRider, role: 'DELIVERY_PARTNER' },
        { userId: ids.user, role: 'ADMIN' },
        { userId: ids.user, role: 'RESTAURANT' }, // right id, wrong role
    ];
    for (const authUser of outsiders) {
        const v = evaluateCallRequest({ order: order(), authUser, targetRole: 'customer' });
        assert.deepEqual([v.ok, v.code, v.httpStatus], [false, 'ORDER_NOT_FOUND', 404], JSON.stringify(authUser));
    }
    assert.equal(evaluateCallRequest({ order: null, authUser: customer, targetRole: 'rider' }).code, 'ORDER_NOT_FOUND');
});

test('a rider who has not accepted the order is not a party', () => {
    const offered = order({ dispatch: { status: 'assigned', deliveryPartnerId: ids.rider } });
    assert.equal(evaluateCallRequest({ order: offered, authUser: rider, targetRole: 'customer' }).code, 'ORDER_NOT_FOUND');
});

test('rejects self-calls and unknown targets', () => {
    assert.equal(evaluateCallRequest({ order: order(), authUser: customer, targetRole: 'customer' }).code, 'INVALID_TARGET');
    assert.equal(evaluateCallRequest({ order: order(), authUser: customer, targetRole: 'admin' }).code, 'INVALID_TARGET');
});

test('blocks cancelled and not-yet-accepted orders', () => {
    for (const s of ['cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin']) {
        assert.equal(evaluateCallRequest({ order: order({ orderStatus: s }), authUser: customer, targetRole: 'restaurant' }).code, 'ORDER_CANCELLED');
    }
    for (const s of ['created', 'pending_payment']) {
        assert.equal(evaluateCallRequest({ order: order({ orderStatus: s }), authUser: customer, targetRole: 'restaurant' }).code, 'ORDER_NOT_ACTIVE');
    }
});

test('allows active statuses through pickup', () => {
    for (const s of ['confirmed', 'preparing', 'ready_for_pickup', 'picked_up']) {
        assert.equal(evaluateCallRequest({ order: order({ orderStatus: s }), authUser: customer, targetRole: 'rider' }).ok, true, s);
    }
});

test('calling the rider requires an accepted rider', () => {
    const unassigned = order({ dispatch: { status: 'unassigned', deliveryPartnerId: null } });
    assert.equal(evaluateCallRequest({ order: unassigned, authUser: customer, targetRole: 'rider' }).code, 'RIDER_NOT_ASSIGNED');
    assert.equal(evaluateCallRequest({ order: unassigned, authUser: restaurant, targetRole: 'rider' }).code, 'RIDER_NOT_ASSIGNED');
    // Customer <-> restaurant still works before a rider is found.
    assert.equal(evaluateCallRequest({ order: unassigned, authUser: customer, targetRole: 'restaurant' }).ok, true);
});

test('delivered orders stay callable only inside the post-delivery window', () => {
    const deliveredAt = new Date('2026-10-27T10:00:00Z');
    const delivered = order({ orderStatus: 'delivered', deliveryState: { deliveredAt } });
    const at = (min) => new Date(deliveredAt.getTime() + min * 60000);
    assert.equal(evaluateCallRequest({ order: delivered, authUser: customer, targetRole: 'rider', now: at(29), postDeliveryMinutes: 30 }).ok, true);
    assert.equal(evaluateCallRequest({ order: delivered, authUser: customer, targetRole: 'rider', now: at(31), postDeliveryMinutes: 30 }).code, 'CALL_WINDOW_CLOSED');
    assert.equal(evaluateCallRequest({ order: delivered, authUser: customer, targetRole: 'rider', now: at(1), postDeliveryMinutes: 0 }).code, 'CALL_WINDOW_CLOSED');
});
