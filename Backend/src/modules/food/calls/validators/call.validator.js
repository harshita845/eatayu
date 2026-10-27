import { z } from 'zod';
import { ValidationError } from '../../../../core/auth/errors.js';

const maskedCallSchema = z.object({
    orderId: z.string().trim().min(1, 'Order id required').max(64),
    targetRole: z.enum(['customer', 'rider', 'restaurant'], {
        errorMap: () => ({ message: 'targetRole must be customer, rider or restaurant' }),
    }),
});

export function validateMaskedCallDto(body) {
    const result = maskedCallSchema.safeParse(body || {});
    if (!result.success) {
        throw new ValidationError(result.error.issues?.[0]?.message || 'Validation failed');
    }
    return result.data;
}
