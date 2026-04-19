import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  is_read: { type: Boolean, default: false },
}, { timestamps: true });

export const NotificationModel = mongoose.model('Notification', notificationSchema);
