import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOtp = async (phone, otp) => {
  try {
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    await client.messages.create({
      body: `Your OTP for doctor registration is ${otp}. It is valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
    return true;
  } catch (error) {
    console.error("Error sending OTP:", error);
    return false;
  }
};
