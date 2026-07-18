-- Rename Stripe-specific columns to Paddle-specific columns.

-- customers
ALTER TABLE "customers" RENAME COLUMN "stripe_customer_id" TO "paddle_customer_id";
ALTER INDEX "customers_stripe_customer_id_key" RENAME TO "customers_paddle_customer_id_key";

-- subscriptions
ALTER TABLE "subscriptions" RENAME COLUMN "stripe_subscription_id" TO "paddle_subscription_id";
ALTER TABLE "subscriptions" RENAME COLUMN "stripe_price_id" TO "paddle_price_id";
ALTER INDEX "subscriptions_stripe_subscription_id_key" RENAME TO "subscriptions_paddle_subscription_id_key";

-- payments
ALTER TABLE "payments" RENAME COLUMN "stripe_payment_intent_id" TO "paddle_transaction_id";
