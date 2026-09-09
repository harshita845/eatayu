import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../src/modules/food/delivery/models/deliveryPartner.model.js';
import { FoodZone } from '../src/modules/food/admin/models/zone.model.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGODB_URI not found in env!");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    // Find or create Indore zone
    let indoreZone = await FoodZone.findOne({
      $or: [
        { name: /indore/i },
        { zoneName: /indore/i },
        { serviceLocation: /indore/i },
        { city: /indore/i }
      ]
    });

    if (!indoreZone) {
      console.log("Indore zone not found. Creating Indore zone...");
      indoreZone = await FoodZone.create({
        name: "Indore",
        zoneName: "Indore Zone",
        serviceLocation: "Indore, Madhya Pradesh",
        isActive: true,
        coordinates: [
          { lat: 22.7, lng: 75.8 },
          { lat: 22.8, lng: 75.8 },
          { lat: 22.8, lng: 75.9 },
          { lat: 22.7, lng: 75.9 }
        ]
      });
      console.log(`Created Indore Zone (ID: ${indoreZone._id})`);
    } else {
      console.log(`Found Indore Zone (ID: ${indoreZone._id}, Name: ${indoreZone.name || indoreZone.zoneName})`);
    }

    const phone = "6267429441";

    // 1. Create or Update Restaurant for 6267429441
    const restaurantData = {
      restaurantName: "Indore Taste Hub",
      ownerName: "Indore Owner",
      ownerPhone: phone,
      phone: phone,
      primaryContactNumber: phone,
      pureVegRestaurant: false,
      isAcceptingOrders: true,
      status: "approved",
      isActive: true,
      isDeleted: false,
      city: "Indore",
      addressLine1: "Vijay Nagar, Indore",
      location: {
        type: "Point",
        coordinates: [75.89, 22.75],
        latitude: 22.75,
        longitude: 75.89
      },
      zoneId: indoreZone._id,
      cuisines: ["North Indian", "Fast Food", "Street Food"],
      openingTime: "09:00 AM",
      closingTime: "11:00 PM",
      openDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      estimatedDeliveryTime: "25-35 mins",
      estimatedDeliveryTimeMinutes: 30,
      rating: 4.6,
      totalRatings: 50,
      approvedAt: new Date()
    };

    let existingRest = await FoodRestaurant.findOne({
      $or: [{ ownerPhone: phone }, { phone: phone }, { primaryContactNumber: phone }]
    });

    if (existingRest) {
      Object.assign(existingRest, restaurantData);
      await existingRest.save();
      console.log(`Updated existing Restaurant: ${existingRest.restaurantName} (ID: ${existingRest._id}) with phone ${phone}`);
    } else {
      const createdRest = await FoodRestaurant.create(restaurantData);
      console.log(`Created new Restaurant: ${createdRest.restaurantName} (ID: ${createdRest._id}) with phone ${phone}`);
    }

    // 2. Create or Update Delivery Partner for 6267429441
    const deliveryData = {
      name: "Indore Delivery Partner",
      phone: phone,
      city: "Indore",
      vehicleType: "bike",
      vehicleName: "Honda Activa",
      vehicleNumber: "MP09AB6267",
      status: "approved",
      isActive: true,
      approvedAt: new Date(),
      availabilityStatus: "online",
      zoneId: indoreZone._id,
      lastLocation: {
        type: "Point",
        coordinates: [75.89, 22.75]
      },
      lastLat: 22.75,
      lastLng: 75.89,
      lastLocationAt: new Date()
    };

    let existingDP = await FoodDeliveryPartner.findOne({ phone: phone });

    if (existingDP) {
      Object.assign(existingDP, deliveryData);
      await existingDP.save();
      console.log(`Updated existing Delivery Partner: ${existingDP.name} (ID: ${existingDP._id}) with phone ${phone}`);
    } else {
      const createdDP = await FoodDeliveryPartner.create(deliveryData);
      console.log(`Created new Delivery Partner: ${createdDP.name} (ID: ${createdDP._id}) with phone ${phone}`);
    }

    console.log("\nSuccess! Both Restaurant and Delivery Partner created/approved for Indore zone with phone 6267429441.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error executing script:", err);
    process.exit(1);
  }
}

run();
