import { getEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/payments/stripe";

type CreateStripeCheckoutSessionInput = {
  businessId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  customerName: string;
  customerEmail: string;
};

export async function createStripeCheckoutSession(input: CreateStripeCheckoutSessionInput) {
  const stripe = getStripeClient();
  const env = getEnv();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${env.AUTH_URL}/payments?checkout=success&invoiceId=${encodeURIComponent(input.invoiceId)}`,
    cancel_url: `${env.AUTH_URL}/payments?checkout=cancelled&invoiceId=${encodeURIComponent(input.invoiceId)}`,
    customer_email: input.customerEmail,
    metadata: {
      businessId: input.businessId,
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
    },
    payment_intent_data: {
      metadata: {
        businessId: input.businessId,
        invoiceId: input.invoiceId,
        invoiceNumber: input.invoiceNumber,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amount,
          product_data: {
            name: `Invoice ${input.invoiceNumber}`,
            description: `Payment for ${input.customerName}`,
          },
        },
      },
    ],
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}
