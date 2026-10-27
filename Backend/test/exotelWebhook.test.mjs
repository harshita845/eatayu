import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyWebhookSecret, parseExotelStatusCallback, mapExotelStatus } from '../src/modules/food/calls/services/exotelWebhook.js';
import { redactUrl } from '../src/utils/redact.js';

test('webhook secret check', () => {
    assert.equal(verifyWebhookSecret('s3cret', 's3cret'), true);
    assert.equal(verifyWebhookSecret('wrong', 's3cret'), false);
    assert.equal(verifyWebhookSecret('s3cret-longer', 's3cret'), false);
    assert.equal(verifyWebhookSecret('', 's3cret'), false);
    assert.equal(verifyWebhookSecret(undefined, 's3cret'), false);
    assert.equal(verifyWebhookSecret('anything', ''), false, 'unset secret must never match');
});

test('parses a JSON terminal callback', () => {
    const e = parseExotelStatusCallback({
        CallSid: 'abc123', EventType: 'terminal', Status: 'completed', ConversationDuration: 42,
        RecordingUrl: 'https://rec.example/x.mp3', CustomField: '6ad9ef8bae170cb6ea3005fa',
        StartTime: '2026-10-27 10:00:00', EndTime: '2026-10-27 10:00:50',
    });
    assert.equal(e.callSid, 'abc123');
    assert.equal(e.status, 'completed');
    assert.equal(e.durationSeconds, 42);
    assert.equal(e.recordingUrl, 'https://rec.example/x.mp3');
    assert.equal(e.customField, '6ad9ef8bae170cb6ea3005fa');
    assert.ok(e.endedAt instanceof Date);
});

test('parses form-style / alternate field names', () => {
    const e = parseExotelStatusCallback({ Sid: 'xyz', CallStatus: 'no-answer', Duration: '0' });
    assert.deepEqual([e.callSid, e.status, e.durationSeconds, e.customField], ['xyz', 'no-answer', 0, null]);
    assert.equal(parseExotelStatusCallback({ Call: { Sid: 'nested', Status: 'busy' } }).status, 'busy');
});

test('maps Exotel statuses to CallLog statuses', () => {
    assert.equal(mapExotelStatus('queued'), 'initiated');
    assert.equal(mapExotelStatus('in-progress'), 'in-progress');
    assert.equal(mapExotelStatus('canceled'), 'failed');
    assert.equal(mapExotelStatus('weird'), null);
});

test('secrets are redacted from logged URLs', () => {
    assert.equal(redactUrl('/api/v1/webhooks/exotel/call-status?secret=abc&x=1'), '/api/v1/webhooks/exotel/call-status?secret=[REDACTED]&x=1');
    assert.equal(redactUrl('/a?x=1&token=t'), '/a?x=1&token=[REDACTED]');
});
