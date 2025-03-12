import mongoose from 'mongoose';

const pharmacySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);
export default Pharmacy;
