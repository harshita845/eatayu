import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { registerDeliveryPartner } from './src/modules/food/delivery/services/delivery.service.js';

dotenv.config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/EatAyu').then(async () => {
    try {
        const payload = {
            name: "Test Partner 2",
            phone: "9876543211",
            email: "test2@example.com",
            countryCode: "+91",
            address: "Test Address",
            city: "Test City",
            state: "Test State",
            vehicleType: "bike",
            vehicleName: "Honda",
            vehicleNumber: "MH12AB9999",
            drivingLicenseNumber: "DL1234567891",
            panNumber: "ABCDE1235F",
            aadharNumber: "123456789013"
        };
        const result = await registerDeliveryPartner(payload, {});
        console.log("Success:", result);
    } catch (error) {
        console.error("Error:", error.stack || error);
    } finally {
        process.exit(0);
    }
});
