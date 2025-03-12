import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransactionStatus',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
