const express = require('express');
const rateLimit = require('express-rate-limit');

const { protect } = require('../middleware/auth');
const {
  register,
  registerOrganization,
  login,
  requestOtp,
  verifyOtp,
  logout,
  me
} = require('../controllers/authController');

const router = express.Router();

// OTP requests are the most abuse-prone endpoint here — throttle it.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' }
});

router.post('/register', authLimiter, register);
router.post('/register-organization', authLimiter, registerOrganization);
router.post('/login', authLimiter, login);
router.post('/otp/request', otpLimiter, requestOtp);
router.post('/otp/verify', authLimiter, verifyOtp);
router.post('/logout', logout);
router.get('/me', protect, me);

// Google OAuth endpoint.
// To enable real Google login:
//   1. Install passport + passport-google-oauth20:  npm i passport passport-google-oauth20
//   2. Set these env vars:
//        GOOGLE_CLIENT_ID=<from Google Cloud Console>
//        GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
//   3. Replace the stub below with:
//        passport.use(new GoogleStrategy({
//          clientID: process.env.GOOGLE_CLIENT_ID,
//          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//          callbackURL: '/api/auth/google/callback'
//        }, async (accessToken, refreshToken, profile, done) => {
//          // Find or create user from profile.emails[0].value
//          // ...
//          return done(null, user);
//        }));
//        router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
//        router.get('/google/callback', passport.authenticate('google'), (req, res) => {
//          const token = signToken(req.user._id);
//          sendTokenCookie(res, token);
//          res.redirect(process.env.FRONTEND_URL || '/');
//        });
//
// Until then, this stub returns a clear 501 so the frontend can surface the
// "not configured" message instead of silently failing.
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env to enable Login with Google. Alternatively, sign in with email + password or OTP.'
    });
  }
  // If credentials ARE set but this stub is still here, the developer forgot
  // to wire up passport. Surface that clearly.
  res.status(501).json({
    message: 'Google OAuth credentials detected but passport strategy not initialized. See backend/src/routes/authRoutes.js for setup instructions.'
  });
});

module.exports = router;
