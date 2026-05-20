const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    station: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Station',
        required: true,
    },
    vehicleNumber: {
        type: String,
        required: [true, 'Please add a vehicle number'],
    },
    date: {
        type: Date,
        required: [true, 'Please select a date'],
    },
    startTime: {
        type: String, // format "HH:mm"
        required: [true, 'Please select start time'],
    },
    endTime: {
        type: String, // format "HH:mm"
        required: [true, 'Please select end time'],
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Confirmed', 'Completed', 'Cancelled'],
        default: 'Pending',
    },
    rejectionReason: {
        type: String,
        default: '',
    },
    approvedAt: {
        type: Date,
    },
    rejectedAt: {
        type: Date,
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending',
    },
    bookingConfirmed: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// Compound Index for performance (Filtering by station and date)
bookingSchema.index({ station: 1, date: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
