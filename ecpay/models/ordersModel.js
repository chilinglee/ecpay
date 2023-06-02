const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    itemName: {
      //商品名稱
      type: String,
      required: true,
    },
    transactionId: {
      //綠界交易序號 （唯一值）
      type: String,
      required: true,
    },
    total: {
      //訂單總計金額
      type: Number,
      required: true,
    },
    payStatus: {
      //付款狀態
      type: String,
      enum: ['unpaid', 'failed', 'paid'],
      required: true,
      default: 'unpaid',
    },
    paidAt: {
      type: Date,
    },
  },
  {
    //createdAt, updateAt
    timestamps: true,
  }
);

const Order = mongoose.model('orders', orderSchema);

module.exports = Order;
