import axios from "axios";
import dotenv from "dotenv";
import { ApiError } from "../utils/ApiError.js";
import Transaction from "../models/payment.model.js";

dotenv.config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

// PayPal Sandbox API base URL
const PAYPAL_URL = "https://api-m.sandbox.paypal.com";

// Get PayPal access token
const getPaypalToken = async () => {
  const response = await axios.post(
    `${PAYPAL_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: {
        username: PAYPAL_CLIENT_ID,
        password: PAYPAL_SECRET,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      }
    }
  );

  return response.data.access_token;
};

// Doctor-to-Client Payout
export const doctorToClientTransaction = async (req, res, next) => {
  const { clientEmail, amount } = req.body;

  const doctorId = req.doctor ? req.doctor._id : null;
  const clientId = req.client ? req.client._id : null;

  if (!doctorId || !clientId) {
    return next(new ApiError(400, "Doctor and client are required"));
  }

  try {
    const accessToken = await getPaypalToken();

    // Payout request to PayPal
    const response = await axios.post(
      `${PAYPAL_URL}/v1/payments/payouts`,
      {
        sender_batch_header: {
          email_subject: "You have received a payment",
          email_message: "You have received a payment from MediConnect"
        },
        items: [
          {
            recipient_type: "EMAIL",
            receiver: clientEmail,
            amount: {
              value: amount,
              currency: "USD"
            },
            note: "Payment from doctor",
            sender_item_id: `txn_${Date.now()}`
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const payoutId = response.data.batch_header.payout_batch_id;

    // Save the transaction to MongoDB
    const newTransaction = new Transaction({
      doctorId,
      clientId,
      paypalPayoutId: payoutId,
      amount,
      currency: "USD",
      status: "pending"
    });

    await newTransaction.save();

    res.status(201).json({
      message: "Transaction initiated successfully",
      payoutId,
      transaction: newTransaction
    });

  } catch (error) {
    console.error("PayPal Payout Error:", error);
    next(new ApiError(500, "Failed to initiate transaction"));
  }
};

// Check transaction status
export const checkTransactionStatus = async (req, res, next) => {
  const { payoutId } = req.params;

  try {
    const accessToken = await getPaypalToken();

    const response = await axios.get(
      `${PAYPAL_URL}/v1/payments/payouts/${payoutId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const transaction = await Transaction.findOne({ paypalPayoutId: payoutId });

    if (transaction) {
      transaction.status = response.data.batch_header.batch_status;
      transaction.completedAt = new Date();
      await transaction.save();
    }

    res.json({
      message: "Transaction status updated",
      status: transaction.status,
      details: response.data
    });

  } catch (error) {
    next(new ApiError(500, "Failed to check transaction status"));
  }
};
