import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';
import {
    getCallConfigController,
    requestMaskedCallController,
    exotelStatusCallbackController,
} from '../controllers/call.controller.js';

/** Authenticated call routes, mounted at /api/v1/calls. */
export const callRoutes = express.Router();
callRoutes.use(authMiddleware, requireRoles('USER', 'DELIVERY_PARTNER', 'RESTAURANT'));
callRoutes.get('/config', getCallConfigController);
callRoutes.post('/masked', requestMaskedCallController);

/** Public Exotel webhooks (secret-protected), mounted at /api/v1/webhooks/exotel. */
export const exotelWebhookRoutes = express.Router();
// JSON and urlencoded bodies are parsed app-wide; this also accepts multipart callbacks.
exotelWebhookRoutes.post('/call-status', multer().none(), exotelStatusCallbackController);
