const Razorpay = require('razorpay');
const dotenv = require('dotenv');
dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function testRazorpay() {
    try {
        console.log('Testing Razorpay with Key ID:', process.env.RAZORPAY_KEY_ID);
        const order = await razorpay.orders.create({
            amount: 100, // 1 INR
            currency: 'INR',
            receipt: 'test_receipt_1',
        });
        console.log('Order created successfully:', order.id);
    } catch (error) {
        console.error('Razorpay test failed:', error);
    }
}

testRazorpay();
