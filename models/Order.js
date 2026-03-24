const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    productId: { type: String, required: true },
    paymentLinkId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "delivered", "failed"],
      default: "pending",
    },
    coupon: { type: String, default: null },
  },
  { timestamps: true }
);

// Fast lookups
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ paymentLinkId: 1 });

module.exports = mongoose.model("Order", orderSchema);
