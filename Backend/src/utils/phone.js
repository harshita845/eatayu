/**
 * Indian mobile number helpers shared by call masking (and safe for logs).
 */

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

/**
 * Normalizes an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts "+91 98765 43210", "919876543210", "09876543210", "9876543210".
 * @param {unknown} raw
 * @returns {string|null} normalized number, or null when it is not a valid Indian mobile
 */
export const normalizeIndianPhone = (raw) => {
    if (raw === null || raw === undefined) return null;
    let digits = String(raw).trim().replace(/[^\d]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return INDIAN_MOBILE_RE.test(digits) ? `+91${digits}` : null;
};

/**
 * Masks a phone number for logs/storage, keeping only the last 4 digits.
 * @param {unknown} raw
 * @returns {string} e.g. "******1234", or "" when there is nothing to mask
 */
export const maskPhone = (raw) => {
    const digits = String(raw ?? '').replace(/[^\d]/g, '');
    if (!digits) return '';
    return `******${digits.slice(-4)}`;
};
