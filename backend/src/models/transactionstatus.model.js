import mongoose from 'mongoose';

const transactionStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, { timestamps: true });

const TransactionStatus = mongoose.model('TransactionStatus', transactionStatusSchema);
export default TransactionStatus;
