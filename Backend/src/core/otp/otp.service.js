import crypto from 'crypto';
import ms from 'ms';
import { FoodOtp } from './otp.model.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../auth/errors.js';

const generateOtpCode = () => {
    const code = crypto.randomInt(1000, 9999);
    return String(code);
};

/**
 * Sends SMS via SMS India Hub API
 * @param {string} phone - 10-digit mobile number (will be prefixed with 91)
 * @param {string} otp
 */
const sendSmsViaIndiaHub = async (phone, otp) => {
    try {
        if (!config.smsApiKey || !config.smsSenderId) {
            logger.warn(`[SMS] SMS India Hub credentials incomplete: apiKey=${Boolean(config.smsApiKey)}, senderId=${Boolean(config.smsSenderId)}`);
            return;
        }

        // Normalize phone: strip non-digits, ensure 91 country code prefix
        const digits = String(phone || '').replace(/\D/g, '');
        const msisdn = digits.startsWith('91') ? digits : `91${digits}`;

        // Message text: Use custom template from .env if provided, or default template
        let message;
        if (config.smsMessageTemplate) {
            message = config.smsMessageTemplate
                .replace(/\{#var#\}|\{#var1#\}|##var##|\{otp\}|\{#OTP#\}/gi, otp);
        } else {
            message = `Welcome to the EatAyu powered by Appzeto.Your OTP for registration is ${otp}.BGADEC.`;
        }

        // SMS India Hub HTTP GET API — query param names are case-sensitive per SOP
        const url = new URL('http://cloud.smsindiahub.in/vendorsms/pushsms.aspx');
        url.searchParams.append('APIKey', config.smsApiKey);
        url.searchParams.append('sid', config.smsSenderId);
        url.searchParams.append('msisdn', msisdn);
        url.searchParams.append('msg', message);
        url.searchParams.append('gwid', '2');
        url.searchParams.append('fl', '0');
        if (config.smsIndiaHubUsername) {
            url.searchParams.append('uname', config.smsIndiaHubUsername);
        }
        if (config.smsDltTemplateId) {
            url.searchParams.append('DLT_TE_ID', config.smsDltTemplateId);
        }
        if (config.smsPeId) {
            url.searchParams.append('entityid', config.smsPeId);
        }

        logger.info(`[SMS] Sending OTP to ${msisdn} via SMS India Hub (sid=${config.smsSenderId})...`);
        const response = await fetch(url.toString());
        const resultText = await response.text();
        logger.info(`[SMS] Raw response for ${msisdn}: ${resultText}`);

        // SMS India Hub returns errors as plain text (e.g. "Failed#senderid not valid") or JSON
        let parsed = null;
        try { parsed = JSON.parse(resultText); } catch (_) { /* plain text response */ }

        let isSuccess = false;
        let errMsg = null;

        if (resultText.startsWith('Failed#')) {
            errMsg = `SMS India Hub rejected request: ${resultText}`;
            if (resultText.toLowerCase().includes('senderid not valid')) {
                errMsg += `\n👉 HINT: The Sender ID "${config.smsSenderId}" is not approved in your SMS India Hub account. Please check your approved 6-character Header at https://cloud.smsindiahub.in.`;
            }
        } else if (parsed && parsed.ErrorCode && parsed.ErrorCode !== '000') {
            errMsg = `SMS India Hub ERROR for ${phone}: [${parsed.ErrorCode}] ${parsed.ErrorMessage || resultText}`;
            if (parsed.ErrorCode === '006') {
                errMsg += `\n👉 HINT: ErrorCode 006 = DLT Template mismatch. The message text must EXACTLY match your approved TRAI DLT template for Template ID ${config.smsDltTemplateId || ''}. Set SMS_INDIA_HUB_MESSAGE_TEMPLATE in .env with your approved template text.`;
            }
        } else if (!response.ok) {
            errMsg = `SMS API HTTP error for ${phone}: ${response.status} – ${resultText}`;
        } else {
            isSuccess = true;
        }

        if (isSuccess) {
            const msgId = parsed?.MessageData?.[0]?.MessageId;
            const jobId = parsed?.JobId;
            logger.info(`✅ SMS gateway accepted OTP for ${msisdn} (JobId: ${jobId || 'N/A'}, MessageId: ${msgId || 'N/A'})`);

            // Check carrier delivery status after 3.5s
            if (msgId && config.smsApiKey) {
                setTimeout(async () => {
                    try {
                        const checkUrl = `http://cloud.smsindiahub.in/vendorsms/checkdelivery.aspx?APIKey=${config.smsApiKey}&messageid=${msgId}`;
                        const checkRes = await fetch(checkUrl);
                        const checkText = await checkRes.text();
                        logger.info(`📡 [CARRIER DELIVERY STATUS] ${msisdn}: ${checkText.trim()}`);
                    } catch (_) {}
                }, 3500);
            }
        } else {
            logger.error(errMsg);
            // eslint-disable-next-line no-console
            console.error(`❌ [SMS ERROR] ${errMsg}`);
        }
    } catch (error) {
        logger.error(`Error sending SMS to ${phone}: ${error.message}`);
        // Do NOT throw — OTP is already stored in DB; SMS failure should not block the flow
    }
};

export const createOrUpdateOtp = async (phone) => {
    const existing = await FoodOtp.findOne({ phone });
    const now = new Date();

    // Rate Limiting Logic
    if (existing) {
        const windowMs = (config.otpRateWindow || 600) * 1000;
        const isInWindow = now - existing.lastRequestAt < windowMs;

        if (isInWindow) {
            if (existing.requestCount >= (config.otpRateLimit || 3)) {
                logger.warn(`Rate limit exceeded for phone ${phone}`);
                throw new ValidationError(`Too many OTP requests. Please try again after ${Math.ceil(windowMs / 60000)} minutes.`);
            }
            existing.requestCount += 1;
        } else {
            // Reset count if window has passed
            existing.requestCount = 1;
        }
    }

    let otp;
    if (config.useDefaultOtp) {
        otp = '1234';
        logger.info(`Default OTP mode enabled – OTP is ${otp} for phone ${phone}`);
    } else {
        otp = generateOtpCode();
    }

    // Always log OTP in terminal during development so developer testing is never blocked
    // eslint-disable-next-line no-console
    console.log(`\n=========================================`);
    // eslint-disable-next-line no-console
    console.log(`🔑 [DEV OTP] Phone: ${phone} | OTP Code: ${otp}`);
    if (config.useDefaultOtp) {
        // eslint-disable-next-line no-console
        console.log(`ℹ️  (USE_DEFAULT_OTP is true: OTP is always 1234)`);
    }
    // eslint-disable-next-line no-console
    console.log(`=========================================\n`);

    // Expiry calculation: prioritize seconds, then minutes, then fallback to MS string
    let ttlMs;
    if (config.otpExpirySeconds) {
        ttlMs = config.otpExpirySeconds * 1000;
    } else if (config.otpExpiryMinutes) {
        ttlMs = config.otpExpiryMinutes * 60 * 1000;
    } else {
        ttlMs = ms(config.otpExpiry || '5m');
    }
    const expiresAt = new Date(now.getTime() + ttlMs);

    if (existing) {
        existing.otp = otp;
        existing.expiresAt = expiresAt;
        existing.attempts = 0;
        existing.lastRequestAt = now;
        await existing.save();
    } else {
        await FoodOtp.create({ 
            phone, 
            otp, 
            expiresAt,
            requestCount: 1,
            lastRequestAt: now
        });
    }

    // Only send SMS if not in default OTP mode
    if (!config.useDefaultOtp) {
        await sendSmsViaIndiaHub(phone, otp);
    }

    return otp;
};

export const verifyOtp = async (phone, otp) => {
    const record = await FoodOtp.findOne({ phone });
    if (!record) {
        return { valid: false, reason: 'OTP not found' };
    }

    if (record.expiresAt < new Date()) {
        return { valid: false, reason: 'OTP expired' };
    }

    if (record.attempts >= config.otpMaxAttempts) {
        return { valid: false, reason: 'Max attempts exceeded' };
    }

    record.attempts += 1;

    if (record.otp !== otp) {
        await record.save();
        return { valid: false, reason: 'Invalid OTP' };
    }

    await record.deleteOne();
    return { valid: true };
};

