import express from "express";
import Medicine from "../models/medicine.model.js";
const router = express.Router();

// GET /api/medicines/search?name=xyz
router.get("/search", async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ success: false, message: "Medicine name is required" });
  }

  try {
    const medicines = await Medicine.find({
      name: { $regex: name, $options: "i" } // case-insensitive match
    }).select("name price(₹) Is_discontinued manufacturer_name type pack_size_label short_composition1 short_composition2");

    res.status(200).json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
