import Stripe from "stripe";
import { getEnv } from "@/lib/env";

let cachedStripe: Stripe | undefined;

export function getStripeClient() {
  if (!cachedStripe) {
    const env = getEnv();

    cachedStripe = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return cachedStripe;
}

export function verifyStripeWebhookEvent(payload: string | Buffer, signature: string) {
  const env = getEnv();

  return getStripeClient().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}
