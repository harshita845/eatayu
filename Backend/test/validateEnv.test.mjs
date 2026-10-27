import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv } from './helpers.mjs';
setTestEnv();
const { getMissingCallMaskingVars } = await import('../src/config/validateEnv.js');

const full = {
    callMaskingEnabled: true, exotelAccountSid: 'sid', exotelApiKey: 'k', exotelApiToken: 't',
    exotelSubdomain: 'api.exotel.com', exotelExophone: '0804', exotelWebhookSecret: 's', publicApiBaseUrl: 'https://eatayu.com',
};

test('nothing is required while call masking is disabled', () => {
    assert.deepEqual(getMissingCallMaskingVars({ callMaskingEnabled: false }), []);
});

test('lists every missing Exotel var when enabled', () => {
    assert.deepEqual(getMissingCallMaskingVars(full), []);
    assert.deepEqual(
        getMissingCallMaskingVars({ ...full, exotelApiToken: '', exotelExophone: ' ', publicApiBaseUrl: '' }),
        ['EXOTEL_API_TOKEN', 'EXOTEL_EXOPHONE', 'PUBLIC_API_BASE_URL'],
    );
});
