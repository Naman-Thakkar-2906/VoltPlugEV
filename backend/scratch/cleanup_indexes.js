const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function dropIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const collection = db.collection('payments');
        
        console.log('Dropping indexes for payments collection...');
        try {
            await collection.dropIndex('transactionId_1');
            console.log('Dropped transactionId_1');
        } catch (e) {
            console.log('transactionId_1 index not found or already dropped');
        }
        
        try {
            await collection.dropIndex('invoiceId_1');
            console.log('Dropped invoiceId_1');
        } catch (e) {
            console.log('invoiceId_1 index not found or already dropped');
        }
        
        console.log('Index cleanup complete');
        process.exit(0);
    } catch (error) {
        console.error('Error cleaning up indexes:', error);
        process.exit(1);
    }
}

dropIndexes();
