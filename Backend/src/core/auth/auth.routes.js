import express from 'express';
import {
    requestUserOtpController,
    verifyUserOtpController,
    adminLoginController,
    refreshTokenController,
    requestRestaurantOtpController,
    verifyRestaurantOtpController,
    requestDeliveryOtpController,
    verifyDeliveryOtpController,
    logoutController,
    getMeController,
    updateAdminProfileController,
    changeAdminPasswordController,
    requestAdminForgotPasswordOtpController,
    resetAdminPasswordWithOtpController
} from './auth.controller.js';
import { authMiddleware, requireAdmin } from './auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';

const router = express.Router();

// router.use(authRateLimiter); // Removed global application to avoid rate-limiting /me or /refresh-token too strictly

// User OTP login
router.post('/user/request-otp', authRateLimiter, requestUserOtpController);
router.post('/user/verify-otp', authRateLimiter, verifyUserOtpController);
router.get('/user/latest-otp', async (req, res) => {
    try {
        const rawPhone = String(req.query.phone || '').replace(/\D/g, '');
        const phone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
        if (!phone) return res.json({ success: false, message: 'Phone required' });
        const { FoodOtp } = await import('../otp/otp.model.js');
        const doc = await FoodOtp.findOne({ phone }).sort({ updatedAt: -1 }).lean();
        return res.json({ success: true, otp: doc?.otp || null });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }
});

// Restaurant OTP login
router.post('/restaurant/request-otp', authRateLimiter, requestRestaurantOtpController);
router.post('/restaurant/verify-otp', authRateLimiter, verifyRestaurantOtpController);

// Delivery partner OTP login
router.post('/delivery/request-otp', authRateLimiter, requestDeliveryOtpController);
router.post('/delivery/verify-otp', authRateLimiter, verifyDeliveryOtpController);

// Admin login
router.post('/admin/login', authRateLimiter, adminLoginController);

// Admin forgot password (no auth required)
router.post('/admin/forgot-password/request-otp', authRateLimiter, requestAdminForgotPasswordOtpController);
router.post('/admin/forgot-password/reset', authRateLimiter, resetAdminPasswordWithOtpController);

// Refresh token
router.post('/refresh-token', refreshTokenController);

// Logout (invalidates refresh token)
router.post('/logout', logoutController);

// Authenticated user profile (requires Bearer token)
router.get('/me', authMiddleware, getMeController);

// Admin-only: profile update & change password (Bearer + ADMIN role)
router.patch('/admin/profile', authMiddleware, requireAdmin, updateAdminProfileController);
router.post('/admin/change-password', authMiddleware, requireAdmin, changeAdminPasswordController);

export default router;

