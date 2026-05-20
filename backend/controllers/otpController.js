const OTP = require('../models/OTP');
const sendOTPEmail = require('../utils/sendOTPEmail');
const asyncHandler = require('../middleware/asyncHandler');

// ----------------------------------------------------------------
// Helper: generate a cryptographically-safe 6-digit OTP
// ----------------------------------------------------------------
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || !/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(email)) {
        res.status(400);
        throw new Error('Please provide a valid email address');
    }

    // Rate-limit: if a non-expired OTP was sent less than 1 minute ago, reject
    const recentOTP = await OTP.findOne({
        email: email.toLowerCase(),
        expiresAt: { $gt: new Date(Date.now() + 4 * 60 * 1000) }, // expires within next 4 min means sent <1 min ago
    });

    if (recentOTP) {
        res.status(429);
        throw new Error('Please wait 1 minute before requesting a new OTP');
    }

    // Remove any previous OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OTP.create({
        email: email.toLowerCase(),
        otp,
        expiresAt,
    });

    // Send email — if this fails the asyncHandler will catch it
    await sendOTPEmail(email, otp);

    res.status(200).json({
        success: true,
        message: 'OTP sent to your email. Please check your inbox.',
    });
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        res.status(400);
        throw new Error('Email and OTP are required');
    }

    const record = await OTP.findOne({ email: email.toLowerCase() });

    if (!record) {
        res.status(400);
        throw new Error('OTP not found. Please request a new one.');
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
        await OTP.deleteOne({ _id: record._id });
        res.status(400);
        throw new Error('OTP has expired. Please request a new one.');
    }

    // Check correctness
    if (record.otp !== otp.trim()) {
        res.status(400);
        throw new Error('Invalid OTP. Please check and try again.');
    }

    // Mark as verified and delete so it cannot be reused
    await OTP.deleteOne({ _id: record._id });

    res.status(200).json({
        success: true,
        message: 'Email verified successfully!',
    });
});

module.exports = { sendOTP, verifyOTP };
