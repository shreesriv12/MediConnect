import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AgentAssistant = () => {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [booking, setBooking] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const existingScript = document.getElementById("razorpay-script");
      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createPaymentOrder = async (slotRequestId, amount) => {
    const response = await fetch(`${API_URL}/payments/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotRequestId, amount })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to create payment order");
    }

    return data.order;
  };

  const verifyPayment = async (paymentData) => {
    const response = await fetch(`${API_URL}/payments/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Payment verification failed");
    }

    return data;
  };

  const handlePayment = async () => {
    if (!booking?.slotRequestId) {
      setPaymentMessage("Booking details are missing. Please book the slot again.");
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentMessage("");

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay checkout");
      }

      const order = paymentOrder || await createPaymentOrder(booking.slotRequestId, booking.fee);
      setPaymentOrder(order);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_ijfoNq8YTvc5iK",
        amount: order.amount,
        currency: order.currency || "INR",
        name: "MediConnect",
        description: `Appointment with Dr. ${booking.doctor.name}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              slotRequestId: booking.slotRequestId
            });
            setPaymentMessage("Payment successful. Your appointment is confirmed.");
          } catch (err) {
            setPaymentMessage(err.message || "Payment verification failed.");
          }
        },
        notes: {
          slotRequestId: booking.slotRequestId,
          doctorId: booking.doctor._id,
          date: booking.date,
          time: booking.time
        },
        theme: { color: "#2563eb" },
        modal: {
          ondismiss: () => setPaymentMessage("Payment cancelled. You can retry from this booking card.")
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setPaymentMessage(err.message || "Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setReply("");
    setDoctors([]);
    setAvailability([]);
    setBooking(null);
    setPaymentOrder(null);
    setPaymentMessage("");

    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    const token = localStorage.getItem("clientAccessToken");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/agent/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Agent request failed.");
        return;
      }

      setReply(data.reply || "");
      setDoctors(data.doctors || []);
      setAvailability(data.availability || []);
      setBooking(data.booking || null);
      setPaymentOrder(data.booking?.paymentOrder || null);
    } catch (err) {
      setError("Unable to reach the agent. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="agent-assistant card shadow-sm p-4 mb-6">
      <h2 className="text-xl font-semibold mb-3">Smart Booking Assistant</h2>
      <p className="mb-4 text-sm text-slate-500">
        Ask something like "I have diarrhea, show me doctors", "find doctors available on June12", or "book my schedule with this doctor Moksh Jain".
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded-md border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Describe your problem or booking request..."
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Thinking..." : "Ask the assistant"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {reply && <p className="mt-3 rounded-md bg-slate-100 p-3 text-slate-800">{reply}</p>}

      {doctors.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Doctor matches</h3>
          <ul className="mt-2 space-y-3">
            {doctors.map((doctor) => (
              <li key={doctor._id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-semibold">{doctor.name}</p>
                <p className="text-sm text-slate-600">{doctor.specialization}</p>
                <p className="text-sm text-slate-500">{doctor.bio || doctor.description || "No description available."}</p>
                <Link
                  to={`/doctor/${doctor._id}`}
                  className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View profile
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {availability.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Available slots</h3>
          <ul className="mt-2 space-y-3">
            {availability.map((item, idx) => (
              <li key={`${item.doctor._id}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                <p className="font-semibold">{item.doctor.name}</p>
                <p className="text-sm text-slate-600">{item.doctor.specialization}</p>
                <p className="text-sm text-slate-500">Date: {item.date}</p>
                <p className="text-sm text-slate-500">Slots: {item.availableSlots.map((slot) => slot.time).join(", ")}</p>
                <Link
                  to={`/doctor/${item.doctor._id}`}
                  className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View profile
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {booking && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-lg font-semibold">Booking reserved</h3>
          <p className="mt-2 text-sm text-slate-700">
            Dr. {booking.doctor.name} ({booking.doctor.specialization})
          </p>
          <p className="text-sm text-slate-700">Date: {booking.date}</p>
          <p className="text-sm text-slate-700">Time: {booking.time}</p>
          <p className="text-sm text-slate-700">Fee: Rs {booking.fee}</p>
          <p className="mt-2 text-sm text-slate-600">Your booking is reserved. Complete payment to confirm the appointment.</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to={`/doctor/${booking.doctor._id}`}
              className="inline-flex rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              View doctor profile
            </Link>
            <button
              type="button"
              onClick={handlePayment}
              disabled={paymentLoading}
              className="inline-flex rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {paymentLoading ? "Opening payment..." : "Click here to pay"}
            </button>
          </div>

          {paymentMessage && (
            <p className="mt-3 rounded-md bg-white p-2 text-sm text-slate-700">{paymentMessage}</p>
          )}

          {paymentOrder && (
            <div className="mt-3 rounded-md bg-white p-3 border border-slate-200">
              <p className="text-sm font-medium text-slate-700">Payment Order</p>
              <p className="text-sm text-slate-600">Order ID: {paymentOrder.id || paymentOrder.order_id}</p>
              <p className="text-sm text-slate-600">Amount: Rs {paymentOrder.amount ? paymentOrder.amount / 100 : booking.fee}</p>
              <p className="text-sm text-slate-600">Currency: {paymentOrder.currency || "INR"}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AgentAssistant;
