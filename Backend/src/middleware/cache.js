import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const normalizeQueryEntries = (query = {}) => {
    const entries = [];

    for (const key of Object.keys(query).sort()) {
        const value = query[key];

        if (Array.isArray(value)) {
            for (const item of [...value].map((entry) => String(entry)).sort()) {
                entries.push([key, item]);
            }
            continue;
        }

        if (value && typeof value === 'object') {
            entries.push([key, JSON.stringify(value)]);
            continue;
        }

        if (value !== undefined) {
            entries.push([key, String(value)]);
        }
    }

    return entries;
};

const buildCacheKey = (req, prefix, varyByUser = false) => {
    const basePath = `${req.baseUrl || ''}${req.path || ''}`;
    const params = new URLSearchParams(normalizeQueryEntries(req.query));
    const queryString = params.toString();
    const userScope = varyByUser ? `:user:${req.user?.userId || 'guest'}` : '';
    const pathWithQuery = queryString ? `${basePath}?${queryString}` : basePath;

    return `${prefix}:${req.method}:${pathWithQuery}${userScope}`;
};

/**
 * Higher-order function to create a caching middleware.
 * @param {number} ttlInSeconds - Time to live for the cache in seconds.
 * @param {string} prefix - Optional key prefix for Redis (e.g. 'restaurants').
 * @param {{ varyByUser?: boolean, browserTtlSeconds?: number }} options
 * @returns {import('express').RequestHandler}
 */
const MAX_BROWSER_TTL_SECONDS = 30;

export const cacheResponse = (ttlInSeconds = 300, prefix = 'api_cache', options = {}) => {
    const varyByUser = options?.varyByUser === true;
    // Browsers may reuse a public response for at most this long, so an image or
    // banner changed by an admin shows up in the customer app within seconds.
    const browserTtlSeconds = Math.min(Number(options?.browserTtlSeconds || 0), MAX_BROWSER_TTL_SECONDS);

    return async (req, res, next) => {
        if (!config.redisEnabled || req.method !== 'GET') return next();

        const redis = getRedisClient();
        if (!redis || !redis.isReady) return next();

        const key = buildCacheKey(req, prefix, varyByUser);

        const applyHeaders = () => {
            if (browserTtlSeconds > 0) {
                res.setHeader('Cache-Control', `public, max-age=${browserTtlSeconds}`);
            }
        };

        try {
            const cachedData = await redis.get(key);
            if (cachedData) {
                res.setHeader('X-Cache', 'HIT');
                applyHeaders();
                return res.json(JSON.parse(cachedData));
            }

            const originalJson = res.json.bind(res);
            res.json = (body) => {
                if (res.statusCode < 400) {
                    redis.set(key, JSON.stringify(body), { EX: ttlInSeconds })
                        .catch((err) => logger.error(`Redis caching failed for ${key}: ${err.message}`));
                }
                res.setHeader('X-Cache', 'MISS');
                applyHeaders();
                return originalJson(body);
            };

            next();
        } catch (err) {
            logger.warn(`Cache middleware error: ${err.message}`);
            next();
        }
    };
};

/**
 * Clear cache by pattern using SCAN so Redis is not blocked by KEYS on larger datasets.
 * @param {string} pattern - Redis glob pattern for keys to delete.
 */
export const invalidateCache = async (pattern) => {
    if (!config.redisEnabled) return;
    const redis = getRedisClient();
    if (!redis || !redis.isReady) return;

    try {
        const keys = [];
        for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
            keys.push(key);
        }

        if (keys.length > 0) {
            const batchSize = 200;
            for (let i = 0; i < keys.length; i += batchSize) {
                const chunk = keys.slice(i, i + batchSize);
                await redis.del(chunk);
            }
            logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
        }
    } catch (err) {
        logger.error(`Cache invalidation error: ${err.message}`);
    }
};

// Prefixes of public cached endpoints that serve admin-managed content (branding,
// banners, categories, zones, fees, restaurant listings). These are not keyed by a
// single entity, so a successful admin write clears all of them; admin writes are
// rare and fresh content matters more than a few cache misses.
export const ADMIN_CONTENT_CACHE_PREFIXES = [
    'biz_settings', 'power_scan', 'sub_settings', 'feat_settings', 'fee_settings',
    'hero_banners', 'top_banners', 'under_250_banners', 'dining_banners', 'promo_banners',
    'gourmet_banners', 'explore_icons', 'landing_settings',
    'categories', 'dining_categories', 'dining_restaurants', 'search_categories_admin', 'search_unified',
    'zones_public', 'zones_nearby',
    'restaurants', 'restaurant_detail', 'restaurant_menu', 'restaurant_timings', 'restaurant_addons', 'public_foods',
];

/**
 * Clears admin-managed content caches after a successful non-GET request.
 * @type {import('express').RequestHandler}
 */
export const invalidateContentCachesOnWrite = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    res.on('finish', () => {
        if (res.statusCode >= 400) return;
        for (const prefix of ADMIN_CONTENT_CACHE_PREFIXES) {
            void invalidateCache(`${prefix}:*`);
        }
    });
    next();
};
