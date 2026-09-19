const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true, default: '' },
    channels: [{ type: String, enum: ['website', 'email', 'whatsapp'] }],
    scheduleType: { type: String, enum: ['now', 'weekly', 'monthly', 'quarterly'], default: 'now' },
    trainingProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingProgram' },
    deliveryStatus: {
      email: { type: String, default: 'pending' },
      whatsapp: { type: String, default: 'pending' },
      website: { type: String, default: 'delivered' }
    },
    readAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
