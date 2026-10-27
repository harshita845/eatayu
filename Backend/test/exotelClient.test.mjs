import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv } from './helpers.mjs';
setTestEnv();
const { createExotelClient, ExotelError } = await import('../src/services/exotel.service.js');

const SECRET_TOKEN = 'tok_SUPER_SECRET_123';
const baseOpts = { accountSid: 'eatayufooddeliveryllp2', apiKey: 'key_ABC', apiToken: SECRET_TOKEN, subdomain: 'api.exotel.com' };
const params = {
    from: '+919876543210', to: '+919123456789', callerId: '08047112345',
    statusCallback: 'https://eatayu.com/api/v1/webhooks/exotel/call-status?secret=s', customField: 'log123',
    timeLimitSeconds: 600, ringTimeoutSeconds: 30, record: false,
};
const ok = { data: { Call: { Sid: 'CA123', Status: 'queued' } } };
const httpErr = (status, message) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { RestException: { Status: status, Message: message } } } });

test('sends the connect-two-numbers request Exotel expects', async () => {
    const calls = [];
    const client = createExotelClient({ ...baseOpts, httpPost: async (...args) => { calls.push(args); return ok; } });
    const result = await client.connectTwoNumbers(params);
    assert.deepEqual(result, { callSid: 'CA123', status: 'queued' });
    const [url, body, cfg] = calls[0];
    assert.equal(url, 'https://api.exotel.com/v1/Accounts/eatayufooddeliveryllp2/Calls/connect.json');
    assert.deepEqual(cfg.auth, { username: 'key_ABC', password: SECRET_TOKEN });
    assert.ok(cfg.timeout > 0);
    const form = new URLSearchParams(body);
    assert.equal(form.get('From'), '+919876543210');
    assert.equal(form.get('To'), '+919123456789');
    assert.equal(form.get('CallerId'), '08047112345');
    assert.equal(form.get('CallType'), 'trans');
    assert.equal(form.get('TimeLimit'), '600');
    assert.equal(form.get('TimeOut'), '30');
    assert.equal(form.get('Record'), 'false');
    assert.equal(form.get('CustomField'), 'log123');
    assert.equal(form.get('StatusCallback'), params.statusCallback);
    assert.equal(form.get('StatusCallbackEvents[0]'), 'terminal');
    assert.equal(form.get('StatusCallbackContentType'), 'application/json');
});

test('retries once on network error, then succeeds', async () => {
    let n = 0;
    const client = createExotelClient({ ...baseOpts, httpPost: async () => { n += 1; if (n === 1) throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }); return ok; } });
    assert.equal((await client.connectTwoNumbers(params)).callSid, 'CA123');
    assert.equal(n, 2);
});

test('retries once on 5xx and gives up after the second failure', async () => {
    let n = 0;
    const client = createExotelClient({ ...baseOpts, httpPost: async () => { n += 1; throw httpErr(503, 'Service unavailable'); } });
    await assert.rejects(client.connectTwoNumbers(params), (err) => err instanceof ExotelError && err.httpStatus === 503);
    assert.equal(n, 2);
});

test('does not retry 4xx and maps auth errors', async () => {
    let n = 0;
    const client = createExotelClient({ ...baseOpts, httpPost: async () => { n += 1; throw httpErr(401, 'Authentication failed'); } });
    await assert.rejects(client.connectTwoNumbers(params), (err) => err.message === 'Exotel authentication failed');
    assert.equal(n, 1);
});

test('error messages never contain credentials or phone numbers', async () => {
    const leaky = Object.assign(new Error(`Request failed https://key_ABC:${SECRET_TOKEN}@api.exotel.com`), {
        response: { status: 400, data: { RestException: { Message: 'Invalid To' } } },
        config: { auth: { password: SECRET_TOKEN } },
    });
    const client = createExotelClient({ ...baseOpts, httpPost: async () => { throw leaky; } });
    await assert.rejects(client.connectTwoNumbers(params), (err) => {
        const text = `${err.message} ${JSON.stringify(err)}`;
        return !text.includes(SECRET_TOKEN) && !text.includes('key_ABC') && !text.includes('9876543210');
    });
});

test('rejects an unexpected response body', async () => {
    const client = createExotelClient({ ...baseOpts, httpPost: async () => ({ data: { nope: true } }) });
    await assert.rejects(client.connectTwoNumbers(params), /unexpected response/);
});
