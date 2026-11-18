import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'mongo-sanitize';
import xssClean from 'xss-clean';
import compression from 'compression';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { responseTimeLogger } from './middleware/responseTimeLogger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { healthCheck } from './config/health.js';
import { config } from './config/env.js';
import { redactUrl } from './utils/redact.js';

const app = express();

// Trust first proxy (essential for express-rate-limit if behind a proxy)
app.set('trust proxy', 1);

// HTTP response compression (gzip)
app.use(compression({
    level: 6,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// Request ID tracing (before other middlewares so all logs can use it)
app.use(requestIdMiddleware);

// Health endpoints (no rate limit, minimal JSON, no secrets)
app.get('/health', async (_req, res) => {
    try {
        const data = await healthCheck();
        res.status(200).json(data);
    } catch (err) {
        res.status(503).json({ status: 'DOWN', error: 'Health check failed' });
    }
});
app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready' });
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https:", "http:"],
        },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
// Same as morgan 'dev' but with secret query params (webhook ?secret=) redacted.
morgan.token('safe-url', (req) => redactUrl(req.originalUrl || req.url));
app.use(morgan(':method :safe-url :status :response-time ms - :res[content-length]'));
app.use(express.json({
    verify: (req, res, buf) => {
        // ✅ Store rawBody for signature verification (Razorpay Webhooks)
        if (req.originalUrl && req.originalUrl.includes('/webhook/razorpay')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true }));

// Protect against NoSQL injection and XSS
app.use((req, _res, next) => {
    req.body = mongoSanitize(req.body);
    req.query = mongoSanitize(req.query);
    req.params = mongoSanitize(req.params);
    next();
});
app.use(xssClean());

// Global rate limiting for API routes
app.use('/api', apiRateLimiter);

// Optional: log API response time (method, path, status, duration) - no sensitive data
app.use('/api', responseTimeLogger);

// API Routes
app.use('/api', routes);

// Serve uploaded files statically with cache headers.
app.use('/uploads', (req, res, next) => {
    const primaryRoot = path.resolve(config.uploadStorageRoot);
    const primaryPath = path.join(primaryRoot, req.path);

    fs.access(primaryPath, fs.constants.F_OK, (err) => {
        if (!err) {
            return next();
        }
        // Fallback check in relative uploads directory if primary was /var/www/uploads or vice versa
        const fallbackRoot = primaryRoot.includes('var/www')
            ? path.resolve('uploads')
            : path.resolve('/var/www/uploads');
        const fallbackPath = path.join(fallbackRoot, req.path);

        fs.access(fallbackPath, fs.constants.F_OK, (fallbackErr) => {
            if (!fallbackErr) {
                return res.sendFile(fallbackPath);
            }
            // In development only, redirect missing local images to production
            if (config.nodeEnv !== 'production' && !req.headers.host?.includes('eatayu.com')) {
                return res.redirect(`https://eatayu.com/uploads${req.path}`);
            }
            res.status(404).send('File not found');
        });
    });
}, express.static(path.resolve(config.uploadStorageRoot), {
    maxAge: '7d',
    etag: true,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    }
}));

// Error Handling
app.use(errorHandler);

export default app;
