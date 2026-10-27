import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIndianPhone, maskPhone } from '../src/utils/phone.js';

test('normalizes common Indian formats to +91XXXXXXXXXX', () => {
    for (const input of ['9876543210', '+91 98765 43210', '919876543210', '09876543210', '+91-98765-43210', 9876543210]) {
        assert.equal(normalizeIndianPhone(input), '+919876543210', String(input));
    }
});

test('rejects invalid numbers', () => {
    for (const input of ['', null, undefined, '12345', '5876543210', '+1 415 555 0100', '98765432101', 'abc', '0000000000']) {
        assert.equal(normalizeIndianPhone(input), null, String(input));
    }
});

test('masks all but the last 4 digits', () => {
    assert.equal(maskPhone('+919876543210'), '******3210');
    assert.equal(maskPhone(''), '');
    assert.equal(maskPhone(null), '');
});
