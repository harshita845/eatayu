import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv } from './helpers.mjs';
setTestEnv();
const { ExotelError } = await import('../src/services/exotel.service.js');
const { connectWithLegFallback } = await import('../src/modules/food/calls/services/maskedCall.service.js');

const params = { from: '+919800000001', to: '+919800000002', callerId: '09513886363' };
const fakeClient = (outcomes) => {
    const seen = [];
    return {
        seen,
        connectTwoNumbers: async (p) => {
            seen.push({ from: p.from, to: p.to });
            const next = outcomes.shift();
            if (next instanceof Error) throw next;
            return next;
        },
    };
};

test('uses the normal leg order when Exotel accepts it', async () => {
    const client = fakeClient([{ callSid: 'CA1', status: 'queued' }]);
    const out = await connectWithLegFallback(client, params);
    assert.deepEqual(out, { result: { callSid: 'CA1', status: 'queued' }, legsSwapped: false });
    assert.deepEqual(client.seen, [{ from: params.from, to: params.to }]);
});

test('retries once with legs swapped when Exotel answers 5xx', async () => {
    const client = fakeClient([new ExotelError('Exotel request failed (500)', { httpStatus: 500 }), { callSid: 'CA2', status: 'queued' }]);
    const out = await connectWithLegFallback(client, params);
    assert.equal(out.legsSwapped, true);
    assert.equal(out.result.callSid, 'CA2');
    assert.deepEqual(client.seen, [{ from: params.from, to: params.to }, { from: params.to, to: params.from }]);
});

test('does not swap legs for client errors such as bad credentials', async () => {
    const client = fakeClient([new ExotelError('Exotel authentication failed', { httpStatus: 401 })]);
    await assert.rejects(connectWithLegFallback(client, params), /authentication failed/);
    assert.equal(client.seen.length, 1);
});

test('reports the failure when the swapped attempt also fails', async () => {
    const client = fakeClient([new ExotelError('fail 1', { httpStatus: 500 }), new ExotelError('fail 2', { httpStatus: 500 })]);
    await assert.rejects(connectWithLegFallback(client, params), /fail 2/);
    assert.equal(client.seen.length, 2);
});
