import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { setTestEnv } from './helpers.mjs';
setTestEnv({ CALL_MASKING_ENABLED: 'false' });

const { default: app } = await import('../src/app.js');
const { signAccessToken } = await import('../src/core/auth/token.util.js');
const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
test.after(() => server.close());

// RESTAURANT tokens need no DB lookup in authMiddleware, so these run without MongoDB.
const restToken = signAccessToken({ userId: '6ac4944ceceb9c35d3e56756', role: 'RESTAURANT' });
const adminToken = signAccessToken({ userId: '6ac4944ceceb9c35d3e56756', role: 'ADMIN' });
const post = (path, body, token, extraHeaders = {}) => fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
    body: JSON.stringify(body),
});

test('webhook rejects missing or wrong secret with 401', async () => {
    assert.equal((await post('/webhooks/exotel/call-status', { CallSid: 'x' })).status, 401);
    assert.equal((await post('/webhooks/exotel/call-status?secret=wrong', { CallSid: 'x' })).status, 401);
});

test('masked call requires authentication and a party role', async () => {
    assert.equal((await post('/calls/masked', { orderId: 'x', targetRole: 'rider' })).status, 401);
    assert.equal((await post('/calls/masked', { orderId: 'x', targetRole: 'rider' }, adminToken)).status, 403);
});

test('masked call validates the body', async () => {
    const res = await post('/calls/masked', { orderId: 'x', targetRole: 'admin' }, restToken);
    assert.equal(res.status, 400);
});

test('disabled mode returns a clear message and never calls Exotel', async () => {
    const res = await post('/calls/masked', { orderId: '6ad9ef8bae170cb6ea3005fa', targetRole: 'rider' }, restToken);
    const json = await res.json();
    assert.equal(res.status, 503);
    assert.deepEqual([json.success, json.code], [false, 'CALL_MASKING_DISABLED']);
    assert.equal(/\d{10}/.test(JSON.stringify(json)), false);
});

test('config endpoint reports masking state to the apps', async () => {
    const res = await fetch(`${base}/calls/config`, { headers: { Authorization: `Bearer ${restToken}` } });
    assert.deepEqual(await res.json(), { success: true, data: { enabled: false } });
});
