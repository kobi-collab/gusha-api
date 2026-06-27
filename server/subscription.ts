/**
 * Subscription backend — disabled for v1.0.2 (free launch).
 * Endpoints remain so the API stays stable; purchases return an error.
 */

export async function getActiveSubscription(_userId: number) {
  return null;
}

export async function getSubscriptionHistory(_userId: number) {
  return [];
}

export async function createSubscription(_input: {
  userId: number;
  planId: string;
  duration: string;
  store: string;
  productId: string;
  transactionId?: string;
  receiptData?: string;
}) {
  throw new Error("In-app purchases are not available in Gusha v1.0.2. All features are free.");
}

export async function cancelSubscription(_userId: number) {
  return { success: true };
}

export async function restoreSubscription(_userId: number) {
  return null;
}

export async function validateReceipt(_store: string, _receiptData: string) {
  throw new Error("In-app purchases are not available in Gusha v1.0.2. All features are free.");
}
