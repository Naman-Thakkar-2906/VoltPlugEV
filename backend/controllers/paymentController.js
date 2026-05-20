const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../middleware/asyncHandler');
const { getIO } = require('../socket');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId).populate('station');

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    // 1. Ownership Validation
    if (booking.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to pay for this booking');
    }

    // 2. Status Validation
    if (booking.status !== 'Approved') {
        res.status(400);
        throw new Error(`Booking cannot be paid in current status: ${booking.status}`);
    }

    // 3. Duplicate Payment Protection
    if (booking.paymentStatus === 'Paid') {
        res.status(400);
        throw new Error('Booking has already been paid');
    }

    // 4. Create Razorpay Order
    const options = {
        amount: booking.totalAmount * 100, // Amount in paise
        currency: 'INR',
        receipt: `receipt_${bookingId}`,
    };

    try {
        const order = await razorpay.orders.create(options);

        // Update or Create Payment record as Pending
        let payment = await Payment.findOne({ booking: bookingId });
        
        if (!payment) {
            payment = new Payment({
                booking: bookingId,
                user: req.user._id,
                amount: booking.totalAmount,
                paymentStatus: 'Pending',
                razorpayOrderId: order.id,
            });
        } else {
            payment.razorpayOrderId = order.id;
            payment.paymentStatus = 'Pending';
        }

        await payment.save();

        res.status(200).json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID,
                user: {
                    name: req.user.name,
                    email: req.user.email,
                }
            }
        });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500);
        throw new Error('Could not create Razorpay order');
    }
});

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId
    } = req.body;

    const booking = await Booking.findById(bookingId).populate('station');
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    // Verify Signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest("hex");

    if (razorpay_signature !== expectedSign) {
        // Mark payment as Failed
        await Payment.findOneAndUpdate(
            { booking: bookingId },
            { paymentStatus: 'Failed' }
        );
        
        res.status(400);
        throw new Error('Invalid payment signature');
    }

    // Signature matches - Update payment and booking
    const invoiceId = `VOLT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await Payment.findOneAndUpdate(
        { booking: bookingId },
        {
            paymentStatus: 'Paid',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            amountPaid: booking.totalAmount,
            paidAt: new Date(),
            invoiceId,
            method: 'Razorpay'
        },
        { new: true }
    );

    // Update Booking (DO NOT overwrite status 'Approved')
    booking.paymentStatus = 'Paid';
    booking.bookingConfirmed = true;
    await booking.save();

    // Emit Real-time Updates
    const io = getIO();
    
    const populatedBooking = await Booking.findById(booking._id)
        .populate('user', 'name email')
        .populate('station', 'name address city owner');

    // To User
    io.to(`user_${booking.user}`).emit('paymentUpdated', { 
        bookingId: booking._id, 
        paymentStatus: 'Paid', 
        bookingConfirmed: true 
    });

    // To Admin
    io.to('admin_room').emit('bookingUpdated', { ...populatedBooking._doc, payment });
    io.to('admin_room').emit('paymentUpdated', payment);

    // To Station Master
    if (populatedBooking.station && populatedBooking.station.owner) {
        io.to(`stationMaster_${populatedBooking.station.owner}`).emit('bookingUpdated', { ...populatedBooking._doc, payment });
    }

    res.status(200).json({
        success: true,
        message: 'Payment verified and booking confirmed',
        data: {
            booking,
            payment
        }
    });
});

module.exports = {
    createOrder,
    verifyPayment,
};
