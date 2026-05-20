const mongoose = require('mongoose');
const Station = require('../models/Station');
const Booking = require('../models/Booking');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get stats for all stations owned by the current station master
// @route   GET /api/station-master/stats
// @access  Private/StationMaster
const getStationMasterStats = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;

    // Find all stations owned by this user
    const stations = await Station.find({ owner: ownerId });

    if (stations.length === 0) {
        return res.json({
            success: true,
            message: 'No stations assigned to this account',
            data: []
        });
    }

    const stationIds = stations.map(s => s._id);

    // Get stats for these stations
    const statsPromises = stations.map(async (station) => {
        // Total Bookings
        const totalBookings = await Booking.countDocuments({ station: station._id });

        // Revenue (confirmed or completed)
        const revenueData = await Booking.aggregate([
            {
                $match: {
                    station: station._id,
                    status: { $in: ['confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);

        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        // Active Bookings (confirmed)
        const activeBookings = await Booking.countDocuments({
            station: station._id,
            status: 'confirmed'
        });

        // Available slots (simplified)
        const availableSlots = Math.max(0, station.totalSlots - activeBookings);

        return {
            stationId: station._id,
            stationName: station.name,
            totalBookings,
            totalRevenue,
            activeBookings,
            availableSlots
        };
    });

    const detailedStats = await Promise.all(statsPromises);

    res.json({
        success: true,
        message: 'Station master stats fetched',
        data: detailedStats
    });
});

// @desc    Get all bookings for stations owned by the current station master
// @route   GET /api/station-master/bookings
// @access  Private/StationMaster
const getStationMasterBookings = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;

    // Find owned stations
    const stations = await Station.find({ owner: ownerId });
    const stationIds = stations.map(s => s._id);

    const bookings = await Booking.find({ station: { $in: stationIds } })
        .populate('user', 'name email')
        .populate('station', 'name')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        message: 'Station master bookings fetched',
        data: bookings
    });
});

module.exports = {
    getStationMasterStats,
    getStationMasterBookings
};
