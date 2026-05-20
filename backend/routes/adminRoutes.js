const express = require('express');
const router = express.Router();
const {
    getAdminStats,
    getStationStats,
    getUsers,
    getAllBookings,
    getAnalytics,
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, getAdminStats);
router.get('/analytics', protect, admin, getAnalytics);
router.get('/station/:id/stats', protect, admin, getStationStats);
router.get('/users', protect, admin, getUsers);
router.get('/bookings', protect, admin, getAllBookings);

module.exports = router;
