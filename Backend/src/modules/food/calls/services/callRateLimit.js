import { getRedisClient } from '../../../../config/redis.js';
import { config } from '../../../../config/env.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Fixed-window counter: max `max` call attempts per (user, order) per `windowSeconds`.
 * Uses Redis when available (shared across PM2 cluster instances), else process memory.
 * @param {{ max?: number, windowSeconds?: number, getRedis?: () => any, now?: () => number }} options
 */
export const createCallAttemptLimiter = ({
    max = 5,
    windowSeconds = 600,
    getRedis = () => (config.redisEnabled && getRedisClient()?.isReady ? getRedisClient() : null),
    now = () => Date.now(),
} = {}) => {
    const local = new Map();

    const hitLocal = (key) => {
        const t = now();
        const entry = local.get(key);
        if (!entry || entry.resetAt <= t) {
            const fresh = { count: 1, resetAt: t + windowSeconds * 1000 };
            local.set(key, fresh);
            return fresh;
        }
        entry.count += 1;
        return entry;
    };

    /**
     * Records one attempt and reports whether it is allowed.
     * @returns {Promise<{ allowed: boolean, remaining: number, retryAfterSeconds: number }>}
     */
    const hit = async (userId, orderId) => {
        const key = `call_rl:${userId}:${orderId}`;
        const redis = getRedis();
        let count;
        let ttlSeconds = windowSeconds;
        if (redis) {
            try {
                count = await redis.incr(key);
                if (count === 1) await redis.expire(key, windowSeconds);
                else ttlSeconds = Math.max(1, Number(await redis.ttl(key)) || windowSeconds);
            } catch (err) {
                logger.warn(`Call rate limit Redis error, using memory: ${err.message}`);
                count = undefined;
            }
        }
        if (count === undefined) {
            const entry = hitLocal(key);
            count = entry.count;
            ttlSeconds = Math.max(1, Math.ceil((entry.resetAt - now()) / 1000));
        }
        return { allowed: count <= max, remaining: Math.max(0, max - count), retryAfterSeconds: ttlSeconds };
    };

    return { hit };
};
