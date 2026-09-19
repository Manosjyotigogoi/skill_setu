const crypto = require('crypto');

function randomDigits(length) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

// e.g. SSU-2026-9382-084
function generateSkillSetuId() {
  const year = new Date().getFullYear();
  return `SSU-${year}-${randomDigits(4)}-${randomDigits(3)}`;
}

// e.g. SETU-FE-REACT-7721
function generateCredentialId(prefix = 'SETU') {
  const clean = prefix.toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'SETU';
  return `${clean}-${randomDigits(4)}`;
}

function hashOtp(otp, salt) {
  return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

function generateOtp() {
  return randomDigits(6);
}

module.exports = { generateSkillSetuId, generateCredentialId, hashOtp, generateOtp };
