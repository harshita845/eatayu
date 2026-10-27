import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv } from './helpers.mjs';
setTestEnv();
const mongoose = (await import('mongoose')).default;
const { stripPartyPhones, sanitizeOrderForDeliveryPartner } = await import('../src/modules/food/orders/services/order.helpers.js');

const order = () => ({
    _id: new mongoose.Types.ObjectId(),
    customerPhone: '9876543210',
    deliveryAddress: { street: 'MG Road', phone: '9876543210', contactNumber: '9876543210' },
    userId: { _id: 'u1', name: 'Asha', phone: '9876543210' },
    restaurantId: { _id: 'r1', restaurantName: 'Vicky', ownerPhone: '9111111111', primaryContactNumber: '9222222222', ownerPhoneLast10: '9111111111' },
    dispatch: { status: 'accepted', deliveryPartnerId: { _id: 'd1', name: 'Ravi', phone: '9333333333', phoneNumber: '9333333333' } },
    deliveryOtp: '1234',
});
const hasPhoneDigits = (o) => /9876543210|9111111111|9222222222|9333333333/.test(JSON.stringify(o));

test('restaurant/rider views contain no phone numbers', () => {
    const out = stripPartyPhones(order());
    assert.equal(hasPhoneDigits(out), false, JSON.stringify(out));
    assert.equal(out.restaurantId.restaurantName, 'Vicky');
    assert.equal(out.dispatch.deliveryPartnerId.name, 'Ravi');
    assert.equal(out.deliveryAddress.street, 'MG Road');
});

test("customer's own view keeps their numbers but hides restaurant and rider", () => {
    const out = stripPartyPhones(order(), { keepCustomerPhone: true });
    assert.equal(out.customerPhone, '9876543210');
    assert.equal(/9111111111|9222222222|9333333333/.test(JSON.stringify(out)), false);
});

test('rider payload has no phones and no handover OTP', () => {
    const out = sanitizeOrderForDeliveryPartner(order());
    assert.equal(hasPhoneDigits(out), false);
    assert.equal(out.deliveryOtp, undefined);
});

test('does not mutate the input and leaves ObjectId references alone', () => {
    const input = order();
    const ref = new mongoose.Types.ObjectId();
    input.restaurantId = ref;
    stripPartyPhones(input);
    assert.equal(input.customerPhone, '9876543210');
    assert.equal(stripPartyPhones(input).restaurantId, ref);
});
