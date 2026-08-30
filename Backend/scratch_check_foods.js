import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/Users/harshitabade/Downloads/EatAyu/Backend', '.env') });

async function query() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const FoodFood = mongoose.model('FoodFood', new mongoose.Schema({}, { strict: false, collection: 'food_items' }));
        const foods = await FoodFood.find({ isRecommended: true }).select('restaurantId name image price').lean();
        console.log('Recommended Foods:', JSON.stringify(foods, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

query();
