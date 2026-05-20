const express = require('express');
const router = express.Router();
const {
    getStations,
    getStationById,
    createStation,
    updateStation,
    deleteStation,
} = require('../controllers/stationController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getStations)
    .post(protect, admin, createStation);

router.route('/:id')
    .get(getStationById)
    .put(protect, admin, updateStation)
    .delete(protect, admin, deleteStation);

module.exports = router;
