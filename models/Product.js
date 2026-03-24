const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true }, // in paise
    emoji: { type: String, default: "🎁" },
    category: { type: String, required: true }, // e.g. "myntra"
    categoryLabel: { type: String, default: "" }, // e.g. "👗 Myntra"
    pool: { type: [String], default: [] }, // available coupon codes
    active: { type: Boolean, default: true },
    sold: { type: Number, default: 0 }, // count of sold coupons
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
