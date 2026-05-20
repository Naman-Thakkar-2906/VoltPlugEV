const Booking = require('../models/Booking');
const Station = require('../models/Station');
const Payment = require('../models/Payment');
const asyncHandler = require('../middleware/asyncHandler');
const { getIO } = require('../socket');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
    const { stationId, vehicleNumber, date, startTime, endTime, totalAmount } = req.body;

    const station = await Station.findById(stationId);
    if (!station) {
        res.status(404);
        throw new Error('Station not found');
    }

    if (!station.owner) {
        res.status(400);
        throw new Error('This station is not currently assigned to an owner and cannot be booked.');
    }

    // Convert date string to Date object (start of day)
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    // 1. Explicit Overlap Logic: (startTime < existingEndTime && endTime > existingStartTime)
    // Find all active bookings for this station on this date
    const existingBookings = await Booking.find({
        station: stationId,
        date: bookingDate,
        status: { $in: ['Pending', 'Approved'] },
        // Simple condition: overlap exists if [start, end] and [existingStart, existingEnd] intersect
        $or: [
            {
                $and: [
                    { startTime: { $lt: endTime } },
                    { endTime: { $gt: startTime } }
                ]
            }
        ]
    });

    // 2. Dynamic Slot Calculation
    // Total Slots available at station - current active bookings in this time window
    const overlappingCount = existingBookings.length;

    if (overlappingCount >= station.totalSlots) {
        res.status(400);
        throw new Error('No slots available for the selected time window');
    }

    const booking = await Booking.create({
        user: req.user._id,
        station: stationId,
        vehicleNumber,
        date: bookingDate,
        startTime,
        endTime,
        totalAmount,
    });

    // Emit to Station Master
    const io = getIO();
    console.log(`Emitting newBookingRequest to room: stationMaster_${station.owner}`);
    io.to(`stationMaster_${station.owner.toString()}`).emit('newBookingRequest', {
        ...booking._doc,
        user: {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone
        },
        station: {
            name: station.name,
            address: station.address
        }
    });

    // Emit to Admin
    io.to('admin_room').emit('newBookingRequest', {
        ...booking._doc,
        user: {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone
        },
        station: {
            name: station.name,
            address: station.address
        }
    });

    res.status(201).json({
        success: true,
        message: 'Booking request created',
        data: booking,
    });
});

// @desc    Get logged in user bookings
// @route   GET /api/bookings/mybookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id })
        .populate('station', 'name address city')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        message: 'User bookings fetched',
        data: bookings,
    });
});

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('user', 'name email')
        .populate('station', 'name address city location');

    if (booking) {
        // Authorize: check if user is the one who booked or an admin
        if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(401);
            throw new Error('Not authorized to view this booking');
        }

        res.json({
            success: true,
            message: 'Booking found',
            data: booking,
        });
    } else {
        res.status(404);
        throw new Error('Booking not found');
    }
});

// @desc    Update booking status (to completed or cancelled)
// @route   PUT /api/bookings/:id/status
// @access  Private
const updateBookingStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (booking) {
        booking.status = status || booking.status;
        const updatedBooking = await booking.save();

        res.json({
            success: true,
            message: `Booking status updated to ${status}`,
            data: updatedBooking,
        });
    } else {
        res.status(404);
        throw new Error('Booking not found');
    }
});

// @desc    Approve booking request
// @route   PUT /api/bookings/:id/approve
// @access  Private (Station Master/Admin)
const approveBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('station');
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    // 1. Ownership Validation
    if (!booking.station || !booking.station.owner) {
        res.status(400);
        throw new Error('Station or owner information missing');
    }

    if (booking.station.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(401);
        throw new Error('Not authorized to approve this booking');
    }

    // 2. Status Validation (Case-insensitive)
    if (booking.status.toLowerCase() !== 'pending') {
        res.status(400);
        throw new Error(`Booking already processed. Current status: ${booking.status}`);
    }

    booking.status = 'Approved';
    booking.approvedAt = new Date();
    const updatedBooking = await booking.save();
    
    // Populate for socket emit
    const populatedBooking = await Booking.findById(updatedBooking._id)
        .populate('user', 'name email phone')
        .populate('station', 'name address city');

    // Emit to User
    const io = getIO();
    io.to(`user_${updatedBooking.user}`).emit('bookingApproved', updatedBooking);

    // Emit to Admin
    io.to('admin_room').emit('bookingUpdated', populatedBooking);

    res.json({
        success: true,
        message: 'Booking approved successfully',
        data: updatedBooking,
    });
});

// @desc    Reject booking request
// @route   PUT /api/bookings/:id/reject
// @access  Private (Station Master/Admin)
const rejectBooking = asyncHandler(async (req, res) => {
    const { rejectionReason } = req.body;
    const booking = await Booking.findById(req.params.id).populate('station');
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    // 1. Ownership Validation
    if (!booking.station || !booking.station.owner) {
        res.status(400);
        throw new Error('Station or owner information missing');
    }

    if (booking.station.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(401);
        throw new Error('Not authorized to reject this booking');
    }

    // 2. Status Validation (Case-insensitive)
    if (booking.status.toLowerCase() !== 'pending') {
        res.status(400);
        throw new Error(`Booking already processed. Current status: ${booking.status}`);
    }

    booking.status = 'Rejected';
    booking.rejectionReason = rejectionReason || 'No reason provided';
    booking.rejectedAt = new Date();
    
    const updatedBooking = await booking.save();

    // Populate for socket emit
    const populatedBooking = await Booking.findById(updatedBooking._id)
        .populate('user', 'name email phone')
        .populate('station', 'name address city');

    // Emit to User
    const io = getIO();
    io.to(`user_${updatedBooking.user}`).emit('bookingRejected', updatedBooking);

    // Emit to Admin
    io.to('admin_room').emit('bookingUpdated', populatedBooking);

    res.json({
        success: true,
        message: 'Booking rejected successfully',
        data: updatedBooking,
    });
});

// @desc    Get all bookings for stations owned by station master
// @route   GET /api/bookings/station-master
// @access  Private (Station Master)
const getStationBookings = asyncHandler(async (req, res) => {
    // 1. Find all stations owned by this user
    const stations = await Station.find({ owner: req.user._id });
    const stationIds = stations.map(s => s._id);

    console.log(`Station Master ID: ${req.user._id}`);
    console.log(`Owned Stations Found: ${stationIds.length}`, stationIds);

    // 2. Find all bookings for these stations
    const bookings = await Booking.aggregate([
        { $match: { station: { $in: stationIds } } },
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $lookup: {
                from: 'stations',
                localField: 'station',
                foreignField: '_id',
                as: 'station'
            }
        },
        { $unwind: '$station' },
        {
            $lookup: {
                from: 'payments',
                localField: '_id',
                foreignField: 'booking',
                as: 'payment'
            }
        },
        { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                'user.password': 0,
                'user.role': 0
            }
        },
        { $sort: { createdAt: -1 } }
    ]);

    console.log(`Bookings Found for these stations: ${bookings.length}`);

    res.json({
        success: true,
        message: 'Station bookings fetched',
        data: bookings,
    });
});

// @desc    Process payment for booking
// @route   POST /api/bookings/:id/pay
// @access  Private
const payBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    // Authorize
    if (booking.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to pay for this booking');
    }

    // Status check
    if (booking.status !== 'Approved') {
        res.status(400);
        throw new Error(`Booking cannot be paid in current status: ${booking.status}`);
    }

    // Create mock payment
    const payment = await Payment.create({
        booking: booking._id,
        user: req.user._id,
        amount: booking.totalAmount,
        method: 'UPI', // Mock
        status: 'success',
        transactionId: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        paidAt: new Date()
    });

    // Update booking status
    booking.status = 'Confirmed';
    await booking.save();

    // Populate for socket emit
    const populatedBooking = await Booking.findById(booking._id)
        .populate('user', 'name email phone')
        .populate('station', 'name address city');

    // Emit to Admin
    const io = getIO();
    io.to('admin_room').emit('bookingUpdated', populatedBooking);
    io.to('admin_room').emit('paymentUpdated', payment);

    res.json({
        success: true,
        message: 'Payment successful and booking confirmed',
        data: {
            booking,
            payment
        }
    });
});

module.exports = {
    createBooking,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    approveBooking,
    rejectBooking,
    payBooking,
    getStationBookings,
};
