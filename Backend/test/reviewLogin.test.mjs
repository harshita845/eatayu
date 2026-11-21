import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv } from './helpers.mjs';
setTestEnv();
const { isReviewLoginPhone } = await import('../src/core/otp/otp.service.js');

const cfg = { reviewLoginPhones: ['9000000001'], reviewLoginOtp: '1234' };

test('matches a review number in any common format', () => {
  for (const p of ['9000000001', '+919000000001', '919000000001', '+91 90000 00001']) {
    assert.equal(isReviewLoginPhone(p, cfg), true, p);
  }
});

test('does not match other numbers', () => {
  assert.equal(isReviewLoginPhone('9000000002', cfg), false);
  assert.equal(isReviewLoginPhone('', cfg), false);
});

test('is off when no review OTP is configured', () => {
  assert.equal(isReviewLoginPhone('9000000001', { reviewLoginPhones: ['9000000001'], reviewLoginOtp: '' }), false);
});
