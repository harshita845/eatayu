import mongoose from 'mongoose';

export const CALL_PARTY_ROLES = ['customer', 'rider', 'restaurant'];
export const CALL_LOG_STATUSES = ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer'];

/**
 * One masked call attempt between two parties of an order.
 * Real phone numbers are never stored — only the last 4 digits, masked.
 */
const callLogSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodOrder', required: true, index: true },
        callerRole: { type: String, enum: CALL_PARTY_ROLES, required: true },
        callerUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
        calleeRole: { type: String, enum: CALL_PARTY_ROLES, required: true },
        calleeUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
        callerPhoneMasked: { type: String, default: '' },
        calleePhoneMasked: { type: String, default: '' },
        exotelCallSid: { type: String, default: null, index: true, sparse: true },
        status: { type: String, enum: CALL_LOG_STATUSES, default: 'initiated', index: true },
        exotelStatus: { type: String, default: '' },
        startedAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
        durationSeconds: { type: Number, default: null },
        recordingUrl: { type: String, default: null },
        errorMessage: { type: String, default: '' },
    },
    { collection: 'food_call_logs', timestamps: true },
);

callLogSchema.index({ orderId: 1, createdAt: -1 });

export const FoodCallLog = mongoose.models.FoodCallLog || mongoose.model('FoodCallLog', callLogSchema);
