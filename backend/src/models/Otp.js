const mongoose = require('mongoose');

// Short-lived OTP records for the passwordless login path.
// TTL index auto-purges expired documents.
const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true }, // email or phone
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Otp', otpSchema);
