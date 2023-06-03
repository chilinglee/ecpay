const express = require('express');
const router = express.Router();
const moment = require('moment');
const { default: ShortUniqueId } = require('short-unique-id');
const SHA256 = require('crypto-js/sha256');

const Order = require('../models/ordersModel');

router.post('/', async (req, res, next) => {
  try {
    //前端在 body post itemName & total 給後端
    const { itemName, total } = req.body;

    //產出綠界需要的交易編號 20碼 uid
    const uid = new ShortUniqueId({ length: 20 });
    const MerchantTradeNo = uid();

    const order = await Order.create({
      itemName,
      transactionId: MerchantTradeNo,
      total,
      payStatus: 'unpaid',
    });

    const base_param = {
      MerchantID: process.env.MerchantID,
      MerchantTradeNo,
      MerchantTradeDate: moment().format('YYYY/MM/DD HH:mm:ss'),
      PaymentType: 'aio',
      TotalAmount: total,
      TradeDesc: 'ecpay test',
      ItemName: itemName,
      ReturnURL: process.env.PaymentReturnURL,
      ChoosePayment: 'Credit',
      EncryptType: 1,
      CustomField1: order.id,
    };

    const form = `
    <form action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5" method="POST" name="payment" style="display: none;">
      <input name="MerchantID" value="${base_param.MerchantID}"/>
      <input name="MerchantTradeNo" value="${base_param.MerchantTradeNo}" />
      <input name="MerchantTradeDate" value="${base_param.MerchantTradeDate}" />
      <input name="PaymentType" value="${base_param.PaymentType}" />
      <input name="TotalAmount" value="${base_param.TotalAmount}" />
      <input name="TradeDesc" value="${base_param.TradeDesc}" />
      <input name="ItemName" value="${base_param.ItemName}" />
      <input name="ReturnURL" value="${base_param.ReturnURL}" />
      <input name="ChoosePayment" value="${base_param.ChoosePayment}" />
      <input name="EncryptType" value="${base_param.EncryptType}" />
      <input name="ClientBackURL" value="${base_param.ClientBackURL}" />
      <input name="CheckMacValue" value="${generateCheckValue(base_param)}" />
      <button type="submit">Submit</button>
    </form>
  `;
    res.status(200).json({
      status: 'Success',
      data: form,
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      message: error,
    });
  }
});

router.post('/payResult', async (req, res, next) => {
  try {
    const { RtnCode, PaymentDate, CustomField1 } = req.body;
    if (RtnCode == 1) {
      //付款成功
      await Order.findByIdAndUpdate(
        CustomField1,
        {
          $set: {
            payStatus: 'paid',
            paidAt: new Date(PaymentDate).toISOString(),
          },
        },
        { new: true, runValidators: true }
      );
    } else {
      //付款失敗
      await Order.findByIdAndUpdate(
        CustomField1,
        {
          $set: {
            payStatus: 'failed',
          },
        },
        { new: true, runValidators: true }
      );
    }
    res.status(200);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
});

function generateCheckValue(params) {
  //將 params 從 Object 換成 Array
  const entries = Object.entries(params);

  //第一步，將 params 按照 key 值得字母順序排列
  entries.sort((a, b) => {
    return a[0].localeCompare(b[0]);
  });

  //第二步，用 key1=value1&key2=value2... 這樣的 pattern 將所有 params 串聯成字串
  //並前後加上 HashKey & HashIV 的 value
  let result =
    `HashKey=${process.env.HashKey}&` +
    entries.map((x) => `${x[0]}=${x[1]}`).join('&') +
    `&HashIV=${process.env.HashIV}`;

  //第三步，encode URL 並轉換成小寫
  result = encodeURIComponent(result).toLowerCase();

  //第四步，因爲綠姐姐的 URL encode 是 follow RFC 1866
  //使用 js 的encodeURIComponent() 還需要處理一下
  //follow guidence from ECPay https://www.ecpay.com.tw/CascadeFAQ/CascadeFAQ_Qa?nID=1197
  result = result
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%20/g, '+');

  //第五步，轉成 SHA256
  result = SHA256(result).toString();

  //最後，轉成大寫
  return result.toUpperCase();
}

module.exports = router;
