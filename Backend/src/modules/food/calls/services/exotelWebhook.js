import crypto from 'crypto';

/**
 * Constant-time comparison of the webhook secret. Hashing first keeps the
 * comparison length-independent. An unset expected secret never matches.
 */
export const verifyWebhookSecret = (provided, expected) => {
    if (!expected || typeof provided !== 'string' || !provided) return false;
    const a = crypto.createHash('sha256').update(provided).digest();
    const b = crypto.createHash('sha256').update(String(expected)).digest();
    return crypto.timingSafeEqual(a, b);
};

const EXOTEL_TO_CALL_LOG_STATUS = Object.freeze({
    queued: 'initiated',
    initiated: 'initiated',
    ringing: 'ringing',
    'in-progress': 'in-progress',
    answered: 'in-progress',
    completed: 'completed',
    failed: 'failed',
    canceled: 'failed',
    cancelled: 'failed',
    busy: 'busy',
    'no-answer': 'no-answer',
});

export const TERMINAL_CALL_STATUSES = Object.freeze(['completed', 'failed', 'busy', 'no-answer']);

/** Maps an Exotel call status to our CallLog status (null if unknown). */
export const mapExotelStatus = (status) => EXOTEL_TO_CALL_LOG_STATUS[String(status || '').trim().toLowerCase()] || null;

const firstOf = (obj, keys) => {
    for (const key of keys) {
        const value = obj?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return undefined;
};

const toNumberOrNull = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

const toDateOrNull = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Normalizes an Exotel status callback (JSON or form body; field names vary
 * slightly between callback formats) into the fields we store.
 */
export const parseExotelStatusCallback = (body = {}) => {
    const src = body?.Call && typeof body.Call === 'object' ? { ...body, ...body.Call } : body;
    const rawStatus = firstOf(src, ['Status', 'CallStatus', 'DialCallStatus']);
    return {
        callSid: firstOf(src, ['CallSid', 'Sid', 'CallSID']) ? String(firstOf(src, ['CallSid', 'Sid', 'CallSID'])) : null,
        customField: firstOf(src, ['CustomField']) ? String(firstOf(src, ['CustomField'])) : null,
        exotelStatus: rawStatus ? String(rawStatus).toLowerCase() : '',
        status: mapExotelStatus(rawStatus),
        durationSeconds: toNumberOrNull(firstOf(src, ['ConversationDuration', 'DialCallDuration', 'Duration'])),
        recordingUrl: firstOf(src, ['RecordingUrl']) ? String(firstOf(src, ['RecordingUrl'])) : null,
        startedAt: toDateOrNull(firstOf(src, ['StartTime', 'DateCreated'])),
        endedAt: toDateOrNull(firstOf(src, ['EndTime', 'DateUpdated'])),
    };
};
