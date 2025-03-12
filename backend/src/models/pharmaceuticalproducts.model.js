import mongoose from 'mongoose';

const pharmaceuticalProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true
  }
}, { timestamps: true });

const PharmaceuticalProduct = mongoose.model('PharmaceuticalProduct', pharmaceuticalProductSchema);
export default PharmaceuticalProduct;
