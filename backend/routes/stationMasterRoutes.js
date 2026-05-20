const express = require('express');
const router = express.Router();
const {
    getStationMasterStats,
    getStationMasterBookings,
} = require('../controllers/stationMasterController');
const { protect, stationMaster } = require('../middleware/authMiddleware');

router.get('/stats', protect, stationMaster, getStationMasterStats);
router.get('/bookings', protect, stationMaster, getStationMasterBookings);

module.exports = router;
