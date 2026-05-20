const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Station = require('../models/Station');
const Booking = require('../models/Booking');

dotenv.config({ path: './.env' });

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Clear existing data
        await User.deleteMany();
        await Station.deleteMany();
        await Booking.deleteMany();

        // Create Admin User
        const admin = await User.create({
            name: 'Admin VoltPlug',
            email: 'admin@voltplug.com',
            password: 'password123',
            role: 'admin'
        });

        // Create Station Master User
        const stationMaster = await User.create({
            name: 'Station Master Ahmad',
            email: 'station@voltplug.com',
            password: 'password123',
            role: 'stationMaster'
        });

        // Create Stations in Ahmedabad
        const stations = [
            {
                name: 'Ahmedabad One Mall EV Station',
                address: 'Vastrapur, Ahmedabad',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5255, 23.0398] },
                pricePerHour: 150,
                totalSlots: 4,
                connectorTypes: ['Type 2', 'CCS2'],
                owner: stationMaster._id
            },
            {
                name: 'Iscon Mega Mall Charging Hub',
                address: 'S.G. Highway, Ahmedabad',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5126, 23.0245] },
                pricePerHour: 200,
                totalSlots: 8,
                connectorTypes: ['Type 2', 'CHAdeMO'],
                owner: stationMaster._id
            },
            {
                name: 'GIFT City EV Portal',
                address: 'GIFT City, Gandhinagar',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.6841, 23.1601] },
                pricePerHour: 180,
                totalSlots: 10,
                connectorTypes: ['CCS2'],
                owner: stationMaster._id
            },
            {
                name: 'Prahlad Nagar Corporate EV Hub',
                address: 'Corporate Road, Prahlad Nagar',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5108, 23.0120] },
                pricePerHour: 170,
                totalSlots: 6,
                connectorTypes: ['Type 2', 'CCS2'],
                owner: stationMaster._id
            },
            {
                name: 'Science City Green Charging',
                address: 'Science City Road, Sola',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5076, 23.0764] },
                pricePerHour: 140,
                totalSlots: 5,
                connectorTypes: ['CCS2', 'GB/T'],
                owner: stationMaster._id
            },
            {
                name: 'Maninagar Railway Station Plaza',
                address: 'Maninagar East',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5996, 22.9962] },
                pricePerHour: 130,
                totalSlots: 4,
                connectorTypes: ['Type 2'],
                owner: stationMaster._id
            },
            {
                name: 'Sindhu Bhavan Lifestyle Charging',
                address: 'SBR, Thaltej',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5039, 23.0405] },
                pricePerHour: 250,
                totalSlots: 12,
                connectorTypes: ['CCS2', 'CHAdeMO', 'Type 2'],
                owner: stationMaster._id
            },
            {
                name: 'SVP International Airport EV Zone',
                address: 'Airport Road, Hansol',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.6347, 23.0772] },
                pricePerHour: 300,
                totalSlots: 15,
                connectorTypes: ['CCS2', 'Type 2'],
                owner: stationMaster._id
            },
            {
                name: 'South Bopal Residency Chargers',
                address: 'South Bopal Main Road',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.4634, 23.0337] },
                pricePerHour: 160,
                totalSlots: 6,
                connectorTypes: ['Type 2', 'CCS2'],
                owner: stationMaster._id
            },
            {
                name: 'Naranpura Community Plug',
                address: 'Ankur Road, Naranpura',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5485, 23.0529] },
                pricePerHour: 145,
                totalSlots: 4,
                connectorTypes: ['Type 2'],
                owner: stationMaster._id
            },
            {
                name: 'Satellite Central Station',
                address: 'Shivranjani Cross Roads',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5178, 23.0304] },
                pricePerHour: 190,
                totalSlots: 8,
                connectorTypes: ['CCS2', 'Type 2'],
                owner: stationMaster._id
            },
            {
                name: 'Nikol Business District EV',
                address: 'Nikol-Naroda Road',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.6679, 23.0446] },
                pricePerHour: 120,
                totalSlots: 10,
                connectorTypes: ['CCS2', 'GB/T'],
                owner: stationMaster._id
            },
            {
                name: 'Chandkheda Metro Charging',
                address: 'Visat Gandhinagar Highway',
                city: 'Ahmedabad',
                location: { type: 'Point', coordinates: [72.5815, 23.1159] },
                pricePerHour: 155,
                totalSlots: 6,
                connectorTypes: ['Type 2', 'CCS2'],
                owner: stationMaster._id
            }
        ];

        await Station.insertMany(stations);

        console.log('Data Seeded Successfully!');
        console.log('Station Master Login: station@voltplug.com / password123');
        process.exit();
    } catch (error) {
        console.error(`Error seeding data: ${error.message}`);
        process.exit(1);
    }
};

seedData();
