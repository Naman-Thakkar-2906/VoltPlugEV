const express = require('express');
const router = express.Router();
const {
    createBooking,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    approveBooking,
    rejectBooking,
    payBooking,
    getStationBookings,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createBooking);

router.get('/mybookings', protect, getMyBookings);
router.get('/station-master', protect, getStationBookings);

router.route('/:id')
    .get(protect, getBookingById);

router.put('/:id/status', protect, updateBookingStatus);
router.put('/:id/approve', protect, approveBooking);
router.put('/:id/reject', protect, rejectBooking);
// router.post('/:id/pay', protect, payBooking); // Disabled in favor of Razorpay

module.exports = router;
