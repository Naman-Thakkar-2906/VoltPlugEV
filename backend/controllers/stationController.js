const Station = require('../models/Station');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all stations with filters
// @route   GET /api/stations
// @access  Public
const getStations = asyncHandler(async (req, res) => {
    const { city, name } = req.query;
    let query = {};

    if (city) {
        query.city = { $regex: city, $options: 'i' };
    }

    if (name) {
        query.name = { $regex: name, $options: 'i' };
    }

    const stations = await Station.find(query).populate('owner', 'name email');

    res.json({
        success: true,
        message: 'Stations fetched successfully',
        data: stations,
    });
});

// @desc    Get single station
// @route   GET /api/stations/:id
// @access  Public
const getStationById = asyncHandler(async (req, res) => {
    const station = await Station.findById(req.params.id);

    if (station) {
        res.json({
            success: true,
            message: 'Station found',
            data: station,
        });
    } else {
        res.status(404);
        throw new Error('Station not found');
    }
});

// @desc    Create a station
// @route   POST /api/stations
// @access  Private/Admin
const createStation = asyncHandler(async (req, res) => {
    const { name, address, city, location, pricePerHour, totalSlots, connectorTypes, owner } = req.body;

    const station = await Station.create({
        name,
        address,
        city,
        location,
        pricePerHour,
        totalSlots,
        connectorTypes,
        owner,
    });

    res.status(201).json({
        success: true,
        message: 'Station created successfully',
        data: station,
    });
});

// @desc    Update a station
// @route   PUT /api/stations/:id
// @access  Private/Admin
const updateStation = asyncHandler(async (req, res) => {
    const station = await Station.findById(req.params.id);

    if (station) {
        station.name = req.body.name || station.name;
        station.address = req.body.address || station.address;
        station.city = req.body.city || station.city;
        station.location = req.body.location || station.location;
        station.pricePerHour = req.body.pricePerHour || station.pricePerHour;
        station.totalSlots = req.body.totalSlots || station.totalSlots;
        station.connectorTypes = req.body.connectorTypes || station.connectorTypes;
        station.isOperational = req.body.isOperational !== undefined ? req.body.isOperational : station.isOperational;
        station.owner = req.body.owner || station.owner;

        const updatedStation = await station.save();
        res.json({
            success: true,
            message: 'Station updated successfully',
            data: updatedStation,
        });
    } else {
        res.status(404);
        throw new Error('Station not found');
    }
});

// @desc    Delete a station
// @route   DELETE /api/stations/:id
// @access  Private/Admin
const deleteStation = asyncHandler(async (req, res) => {
    const station = await Station.findById(req.params.id);

    if (station) {
        await Station.deleteOne({ _id: station._id });
        res.json({
            success: true,
            message: 'Station removed',
            data: null,
        });
    } else {
        res.status(404);
        throw new Error('Station not found');
    }
});

module.exports = {
    getStations,
    getStationById,
    createStation,
    updateStation,
    deleteStation,
};
