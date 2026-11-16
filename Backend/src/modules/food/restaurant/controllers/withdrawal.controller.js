import { sendResponse, sendError } from '../../../../utils/response.js';
import { FoodRestaurantWithdrawal } from '../models/foodRestaurantWithdrawal.model.js';
import { getRestaurantFinance } from '../services/restaurantFinance.service.js';
import { notifyAdminsSafely } from '../../../../core/notifications/firebase.service.js';

export const createWithdrawalRequestController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const { amount, bankDetails } = req.body;

        if (!restaurantId) return sendError(res, 401, 'Restaurant authentication required');
        if (!amount || amount <= 0) return sendError(res, 400, 'Invalid withdrawal amount');

        // Check if restaurant has enough balance
        const finance = await getRestaurantFinance(restaurantId);

        const availableBalance = Math.max(0, Number(finance?.wallet?.withdrawableBalance ?? finance?.wallet?.netAvailable ?? 0));

        if (amount > availableBalance) {
            return sendError(res, 400, `Insufficient balance. Available to withdraw: ₹${availableBalance.toLocaleString('en-IN')}`);
        }

        // Create the withdrawal request
        const withdrawal = new FoodRestaurantWithdrawal({
            restaurantId,
            amount: Number(amount),
            bankDetails,
            status: 'pending'
        });

        await withdrawal.save();

        void notifyAdminsSafely({
            title: 'New Withdrawal Request',
            body: `A restaurant has requested a withdrawal of ₹${amount.toLocaleString('en-IN')}`,
            data: {
                type: 'restaurant_withdrawal',
                restaurantId: restaurantId.toString(),
                amount: String(amount)
            }
        });

        return sendResponse(res, 201, 'Withdrawal request submitted successfully', withdrawal);
    } catch (error) {
        next(error);
    }
};

export const listMyWithdrawalsController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        if (!restaurantId) return sendError(res, 401, 'Restaurant authentication required');

        const withdrawals = await FoodRestaurantWithdrawal.find({ restaurantId })
            .sort({ createdAt: -1 })
            .lean();

        return sendResponse(res, 200, 'Withdrawals fetched successfully', withdrawals);
    } catch (error) {
        next(error);
    }
};
