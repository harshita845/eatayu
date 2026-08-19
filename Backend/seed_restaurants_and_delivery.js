import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { FoodRestaurant } from './src/modules/food/restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from './src/modules/food/delivery/models/deliveryPartner.model.js';
import { FoodZone } from './src/modules/food/admin/models/zone.model.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        // Find the zones to ensure they exist and get correct cases
        const sangrurZone = await FoodZone.findOne({ name: /sangrur/i });
        const indoreZone = await FoodZone.findOne({ name: /indore/i });

        if (!sangrurZone) {
            console.error('Sangrur zone not found in database!');
            process.exit(1);
        }
        if (!indoreZone) {
            console.error('Indore zone not found in database!');
            process.exit(1);
        }

        console.log(`Sangrur Zone ID: ${sangrurZone._id}`);
        console.log(`Indore Zone ID: ${indoreZone._id}`);

        // Helper to clear existing test records so the seed is idempotent
        const testPhones = [
            '9876543210', '9876543211', '9876543212', '9876543213',
            '8876543210', '8876543211', '8876543212', '8876543213'
        ];
        
        await FoodRestaurant.deleteMany({ ownerPhone: { $in: testPhones } });
        await FoodDeliveryPartner.deleteMany({ phone: { $in: testPhones } });
        console.log('Cleared existing test restaurants and delivery partners.');

        // 1. Create Restaurants
        const restaurantsToCreate = [
            {
                restaurantName: 'Sangrur Tadka',
                ownerName: 'Harpreet Singh',
                ownerPhone: '9876543210',
                pureVegRestaurant: false,
                isAcceptingOrders: true,
                status: 'approved',
                city: 'Sangrur',
                addressLine1: 'Main Market, Sangrur',
                location: {
                    type: 'Point',
                    coordinates: [75.84, 30.23],
                    latitude: 30.23,
                    longitude: 75.84
                },
                zoneId: sangrurZone._id,
                cuisines: ['North Indian', 'Punjabi'],
                openingTime: '09:00 AM',
                closingTime: '11:00 PM',
                openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                estimatedDeliveryTime: '30-40 mins',
                estimatedDeliveryTimeMinutes: 35,
                rating: 4.2,
                totalRatings: 45,
                approvedAt: new Date()
            },
            {
                restaurantName: 'Royal Sangrur Kitchen',
                ownerName: 'Gurmeet Singh',
                ownerPhone: '9876543211',
                pureVegRestaurant: true,
                isAcceptingOrders: true,
                status: 'approved',
                city: 'Sangrur',
                addressLine1: 'Club Road, Sangrur',
                location: {
                    type: 'Point',
                    coordinates: [75.83, 30.22],
                    latitude: 30.22,
                    longitude: 75.83
                },
                zoneId: sangrurZone._id,
                cuisines: ['North Indian', 'Chinese', 'Pure Veg'],
                openingTime: '10:00 AM',
                closingTime: '10:00 PM',
                openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                estimatedDeliveryTime: '25-35 mins',
                estimatedDeliveryTimeMinutes: 30,
                rating: 4.5,
                totalRatings: 80,
                approvedAt: new Date()
            },
            {
                restaurantName: 'Indori Sarafa Special',
                ownerName: 'Rajesh Sharma',
                ownerPhone: '9876543212',
                pureVegRestaurant: true,
                isAcceptingOrders: true,
                status: 'approved',
                city: 'Indore',
                addressLine1: 'Sarafa Bazar, Indore',
                location: {
                    type: 'Point',
                    coordinates: [75.86, 22.72],
                    latitude: 22.72,
                    longitude: 75.86
                },
                zoneId: indoreZone._id,
                cuisines: ['Street Food', 'Snacks', 'Pure Veg'],
                openingTime: '08:00 AM',
                closingTime: '11:30 PM',
                openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                estimatedDeliveryTime: '20-30 mins',
                estimatedDeliveryTimeMinutes: 25,
                rating: 4.7,
                totalRatings: 150,
                approvedAt: new Date()
            },
            {
                restaurantName: '56 Dukan Express',
                ownerName: 'Vikram Patel',
                ownerPhone: '9876543213',
                pureVegRestaurant: false,
                isAcceptingOrders: true,
                status: 'approved',
                city: 'Indore',
                addressLine1: '56 Dukan, Indore',
                location: {
                    type: 'Point',
                    coordinates: [75.88, 22.73],
                    latitude: 22.73,
                    longitude: 75.88
                },
                zoneId: indoreZone._id,
                cuisines: ['Fast Food', 'South Indian', 'Desserts'],
                openingTime: '09:00 AM',
                closingTime: '11:00 PM',
                openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                estimatedDeliveryTime: '30-45 mins',
                estimatedDeliveryTimeMinutes: 38,
                rating: 4.4,
                totalRatings: 110,
                approvedAt: new Date()
            }
        ];

        for (const rest of restaurantsToCreate) {
            const created = await FoodRestaurant.create(rest);
            console.log(`Created Restaurant: ${created.restaurantName} (ID: ${created._id}) in ${created.city}`);
        }

        // 2. Create Delivery Partners
        const deliveryPartnersToCreate = [
            {
                name: 'Gurpreet Singh',
                phone: '8876543210',
                city: 'Sangrur',
                vehicleType: 'bike',
                vehicleName: 'Splendor',
                vehicleNumber: 'PB13AB1234',
                status: 'approved',
                approvedAt: new Date(),
                availabilityStatus: 'online',
                lastLocation: {
                    type: 'Point',
                    coordinates: [75.84, 30.23]
                },
                lastLat: 30.23,
                lastLng: 75.84,
                lastLocationAt: new Date()
            },
            {
                name: 'Jaspreet Singh',
                phone: '8876543211',
                city: 'Sangrur',
                vehicleType: 'bike',
                vehicleName: 'Honda Activa',
                vehicleNumber: 'PB13CD5678',
                status: 'approved',
                approvedAt: new Date(),
                availabilityStatus: 'online',
                lastLocation: {
                    type: 'Point',
                    coordinates: [75.83, 30.22]
                },
                lastLat: 30.22,
                lastLng: 75.83,
                lastLocationAt: new Date()
            },
            {
                name: 'Rahul Sharma',
                phone: '8876543212',
                city: 'Indore',
                vehicleType: 'bike',
                vehicleName: 'Hero Passion',
                vehicleNumber: 'MP09EF9012',
                status: 'approved',
                approvedAt: new Date(),
                availabilityStatus: 'online',
                lastLocation: {
                    type: 'Point',
                    coordinates: [75.86, 22.72]
                },
                lastLat: 22.72,
                lastLng: 75.86,
                lastLocationAt: new Date()
            },
            {
                name: 'Amit Patel',
                phone: '8876543213',
                city: 'Indore',
                vehicleType: 'bike',
                vehicleName: 'TVS Jupiter',
                vehicleNumber: 'MP09GH3456',
                status: 'approved',
                approvedAt: new Date(),
                availabilityStatus: 'online',
                lastLocation: {
                    type: 'Point',
                    coordinates: [75.88, 22.73]
                },
                lastLat: 22.73,
                lastLng: 75.88,
                lastLocationAt: new Date()
            }
        ];

        for (const dp of deliveryPartnersToCreate) {
            const created = await FoodDeliveryPartner.create(dp);
            console.log(`Created Delivery Partner: ${created.name} (ID: ${created._id}) in ${created.city}`);
        }

        console.log('Seeding completed successfully!');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Seeding error:', err);
    }
}

seed();
