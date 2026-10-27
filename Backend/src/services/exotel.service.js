import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const DEFAULT_TIMEOUT_MS = 10000;

/** Error raised for any Exotel failure. Message is safe to log (no secrets, no phone numbers). */
export class ExotelError extends Error {
    constructor(message, { httpStatus = null, retryable = false } = {}) {
        super(message);
        this.name = 'ExotelError';
        this.statusCode = 502;
        this.httpStatus = httpStatus;
        this.retryable = retryable;
    }
}

const isRetryable = (err) => {
    const status = err?.response?.status;
    if (!status) return true; // network error / timeout
    return status >= 500;
};

/** Exotel errors come back as { RestException: { Status, Message } }. */
const toExotelError = (err) => {
    const status = err?.response?.status ?? null;
    const exotelMessage = err?.response?.data?.RestException?.Message;
    if (status === 401 || status === 403) {
        return new ExotelError('Exotel authentication failed', { httpStatus: status });
    }
    if (status === 429) {
        return new ExotelError('Exotel rate limit exceeded', { httpStatus: status, retryable: true });
    }
    if (status) {
        return new ExotelError(`Exotel request failed (${status})${exotelMessage ? `: ${String(exotelMessage).slice(0, 200)}` : ''}`, {
            httpStatus: status,
            retryable: status >= 500,
        });
    }
    const reason = err?.code === 'ECONNABORTED' ? 'timed out' : 'network error';
    return new ExotelError(`Exotel request ${reason}`, { retryable: true });
};

/**
 * Creates a client for Exotel's "connect two numbers" API.
 * Exotel rings `from` first and bridges to `to` once answered; both see `callerId`.
 * @param {{ accountSid: string, apiKey: string, apiToken: string, subdomain?: string,
 *           timeoutMs?: number, httpPost?: typeof axios.post }} options
 */
export const createExotelClient = ({
    accountSid,
    apiKey,
    apiToken,
    subdomain = 'api.exotel.com',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    httpPost = axios.post,
}) => {
    const host = String(subdomain).replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const url = `https://${host}/v1/Accounts/${encodeURIComponent(accountSid)}/Calls/connect.json`;

    /**
     * @param {{ from: string, to: string, callerId: string, statusCallback?: string,
     *           customField?: string, timeLimitSeconds?: number, ringTimeoutSeconds?: number,
     *           record?: boolean }} params
     * @returns {Promise<{ callSid: string, status: string }>}
     */
    const connectTwoNumbers = async ({
        from, to, callerId, statusCallback, customField,
        timeLimitSeconds, ringTimeoutSeconds, record = false,
    }) => {
        const form = new URLSearchParams();
        form.append('From', from);
        form.append('To', to);
        form.append('CallerId', callerId);
        form.append('CallType', 'trans');
        form.append('Record', record ? 'true' : 'false');
        if (Number.isFinite(timeLimitSeconds) && timeLimitSeconds > 0) form.append('TimeLimit', String(timeLimitSeconds));
        if (Number.isFinite(ringTimeoutSeconds) && ringTimeoutSeconds > 0) form.append('TimeOut', String(ringTimeoutSeconds));
        if (customField) form.append('CustomField', String(customField).slice(0, 128));
        if (statusCallback) {
            form.append('StatusCallback', statusCallback);
            form.append('StatusCallbackEvents[0]', 'terminal');
            form.append('StatusCallbackContentType', 'application/json');
        }

        const requestConfig = {
            auth: { username: apiKey, password: apiToken },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            timeout: timeoutMs,
        };

        let lastError = null;
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
                const response = await httpPost(url, form.toString(), requestConfig);
                const call = response?.data?.Call;
                if (!call?.Sid) {
                    throw new ExotelError('Exotel returned an unexpected response');
                }
                return { callSid: String(call.Sid), status: String(call.Status || 'queued').toLowerCase() };
            } catch (err) {
                if (err instanceof ExotelError) throw err;
                lastError = err;
                if (attempt === 1 && isRetryable(err)) {
                    logger.warn(`[Exotel] connect attempt ${attempt} failed (${err?.response?.status || err?.code || 'network'}), retrying once`);
                    continue;
                }
                break;
            }
        }
        throw toExotelError(lastError);
    };

    return { connectTwoNumbers };
};

let defaultClient = null;

/** Client built from env config (lazy, so tests and disabled mode never construct it). */
export const getExotelClient = () => {
    if (!defaultClient) {
        defaultClient = createExotelClient({
            accountSid: config.exotelAccountSid,
            apiKey: config.exotelApiKey,
            apiToken: config.exotelApiToken,
            subdomain: config.exotelSubdomain,
        });
    }
    return defaultClient;
};
