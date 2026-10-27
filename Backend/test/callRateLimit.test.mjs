import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv } from './helpers.mjs';
setTestEnv();
const { createCallAttemptLimiter } = await import('../src/modules/food/calls/services/callRateLimit.js');

test('allows 5 attempts per user per order per window, then blocks', async () => {
    let t = 0;
    const limiter = createCallAttemptLimiter({ max: 5, windowSeconds: 600, getRedis: () => null, now: () => t });
    for (let i = 1; i <= 5; i += 1) assert.equal((await limiter.hit('customer:u1', 'o1')).allowed, true, `attempt ${i}`);
    const sixth = await limiter.hit('customer:u1', 'o1');
    assert.equal(sixth.allowed, false);
    assert.ok(sixth.retryAfterSeconds > 0 && sixth.retryAfterSeconds <= 600);
    // Other orders / other users are independent.
    assert.equal((await limiter.hit('customer:u1', 'o2')).allowed, true);
    assert.equal((await limiter.hit('rider:d1', 'o1')).allowed, true);
    // Window expiry resets the counter.
    t = 601 * 1000;
    assert.equal((await limiter.hit('customer:u1', 'o1')).allowed, true);
});

test('uses Redis when available (shared across API instances)', async () => {
    const store = new Map();
    const fakeRedis = {
        incr: async (k) => { store.set(k, (store.get(k) || 0) + 1); return store.get(k); },
        expire: async () => 1,
        ttl: async () => 420,
    };
    const limiter = createCallAttemptLimiter({ max: 2, windowSeconds: 600, getRedis: () => fakeRedis });
    assert.equal((await limiter.hit('u', 'o')).allowed, true);
    assert.equal((await limiter.hit('u', 'o')).allowed, true);
    const third = await limiter.hit('u', 'o');
    assert.deepEqual([third.allowed, third.retryAfterSeconds], [false, 420]);
    assert.equal(store.get('call_rl:u:o'), 3);
});

test('falls back to memory if Redis errors', async () => {
    const broken = { incr: async () => { throw new Error('down'); } };
    const limiter = createCallAttemptLimiter({ max: 1, windowSeconds: 60, getRedis: () => broken });
    assert.equal((await limiter.hit('u', 'o')).allowed, true);
    assert.equal((await limiter.hit('u', 'o')).allowed, false);
});
