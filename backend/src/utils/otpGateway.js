// Development stub for OTP delivery.
//
// No SMS/email provider credentials are configured for this project, so this
// module simply logs the OTP server-side. Wire in a real provider (MSG91,
// Twilio Verify, SendGrid, etc.) here for production — the calling code in
// authController.js does not need to change, only this function's internals.

function looksLikeEmail(identifier) {
  return /@/.test(identifier);
}

async function deliverOtp(identifier, otp) {
  const channel = looksLikeEmail(identifier) ? 'email' : 'SMS';
  // eslint-disable-next-line no-console
  console.log(`[otpGateway] Would send ${channel} OTP ${otp} to ${identifier} (no live gateway configured)`);
  return true;
}

module.exports = { deliverOtp, looksLikeEmail };
