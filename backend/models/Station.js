const mongoose = require('mongoose');

const stationSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a station name'],
        trim: true,
    },
    address: {
        type: String,
        required: [true, 'Please add an address'],
    },
    city: {
        type: String,
        required: [true, 'Please add a city'],
        index: true, // Index for searching by city
    },
    location: {
        // GeoJSON Point
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            required: [true, 'Please add coordinates [longitude, latitude]'],
        },
    },
    pricePerHour: {
        type: Number,
        required: [true, 'Please add price per hour'],
    },
    totalSlots: {
        type: Number,
        required: [true, 'Please add total number of slots'],
        default: 1,
    },
    connectorTypes: {
        type: [String],
        default: ['Type 2'],
    },
    isOperational: {
        type: Boolean,
        default: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

// Index for geo-spatial queries
stationSchema.index({ location: '2dsphere' });

const Station = mongoose.model('Station', stationSchema);

module.exports = Station;
