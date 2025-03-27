import paypal from '@paypal/checkout-server-sdk';

// Configure PayPal environment
function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  // For sandbox environment
  const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
  return new paypal.core.PayPalHttpClient(environment);
}

async function createPayPalOrder(amount, appointmentId) {
  const client = getPayPalClient();
  
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: amount.toString()
      },
      reference_id: appointmentId.toString()
    }],
    application_context: {
      return_url: `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`
    }
  });
  
  const response = await client.execute(request);
  return response.result;
}

async function capturePayPalOrder(orderId) {
  const client = getPayPalClient();
  
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  
  const response = await client.execute(request);
  return response.result;
}

export {
  createPayPalOrder,
  capturePayPalOrder
};