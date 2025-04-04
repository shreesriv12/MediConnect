import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: "userModel" 
  },
  userModel: 
  { 
    type: String, 
    required: true, 
    enum: ["Doctor", "Client"] 
  },
  message: 
  { 
    type: String, 
    required: true 
  },
}, { 
  timestamps: true
 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
