import { config } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Validates required environment configuration on startup.
 * Logs clear errors and exits if critical variables are missing.
 */
export const validateConfig = () => {
    const missing = [];

    if (!config.mongodbUri) {
        missing.push('MONGO_URI or MONGODB_URI');
    }
    if (!config.jwtAccessSecret) {
        missing.push('JWT_ACCESS_SECRET or JWT_SECRET');
    }
    if (!config.jwtRefreshSecret) {
        missing.push('JWT_REFRESH_SECRET');
    }
    if (config.redisEnabled && !config.redisUrl) {
        missing.push('REDIS_URL (required when REDIS_ENABLED=true)');
    }
    if (config.bullmqEnabled && !config.redisEnabled) {
        missing.push('REDIS_ENABLED=true (required when BULLMQ_ENABLED=true)');
    }

    const missingCallMasking = getMissingCallMaskingVars(config);
    if (missingCallMasking.length > 0) {
        missing.push(`${missingCallMasking.join(', ')} (required when CALL_MASKING_ENABLED=true)`);
    }

    if (missing.length > 0) {
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
};

/**
 * Exotel settings are only required when call masking is switched on.
 * @param {typeof config} cfg
 * @returns {string[]} names of missing env vars
 */
export const getMissingCallMaskingVars = (cfg) => {
    if (!cfg.callMaskingEnabled) return [];
    const required = {
        EXOTEL_ACCOUNT_SID: cfg.exotelAccountSid,
        EXOTEL_API_KEY: cfg.exotelApiKey,
        EXOTEL_API_TOKEN: cfg.exotelApiToken,
        EXOTEL_SUBDOMAIN: cfg.exotelSubdomain,
        EXOTEL_EXOPHONE: cfg.exotelExophone,
        EXOTEL_WEBHOOK_SECRET: cfg.exotelWebhookSecret,
        PUBLIC_API_BASE_URL: cfg.publicApiBaseUrl,
    };
    return Object.entries(required)
        .filter(([, value]) => !String(value || '').trim())
        .map(([name]) => name);
};
