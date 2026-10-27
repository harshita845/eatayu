// Hermetic env for tests: never talk to real Redis/Mongo/Exotel, whatever .env says.
export function setTestEnv(overrides = {}) {
    Object.assign(process.env, {
        NODE_ENV: 'test',
        REDIS_ENABLED: 'false',
        BULLMQ_ENABLED: 'false',
        RATE_LIMIT_ENABLED: 'false',
        JWT_ACCESS_SECRET: 'test_access_secret',
        JWT_REFRESH_SECRET: 'test_refresh_secret',
        MONGODB_URI: 'mongodb://127.0.0.1:1/never-used',
        FIREBASE_SERVICE_ACCOUNT: '',
        FIREBASE_SERVICE_ACCOUNT_PATH: '/nonexistent',
        CALL_MASKING_ENABLED: 'false',
        EXOTEL_WEBHOOK_SECRET: 'test_webhook_secret',
        ...overrides,
    });
}
