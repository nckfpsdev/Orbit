import type { Context } from "./security";
import { AppError } from "./security";
import { id, now, row, run } from "./db";
import { RESERVE_CREDITS, REFUND_CREDITS } from "./atomic-queries";

export async function withCredits<T>(
  c: Context,
  action: string,
  operation: () => Promise<T>,
  reference?: string,
): Promise<{ result: T; credits_used: number }> {
  const amount = c.settings.credit_costs[action] ?? 0;
  const transaction = id("credit");
  if (amount) {
    const debit = await row<{ credits: number }>(
      RESERVE_CREDITS,
      amount,
      now(),
      c.orgId,
      amount,
      transaction,
      -amount,
      action,
      reference ?? null,
      now(),
    );
    if (!debit)
      throw new AppError(
        "INSUFFICIENT_CREDITS",
        "Saldo insuficiente para esta ação. Confira seus créditos.",
        402,
      );
  }
  try {
    return { result: await operation(), credits_used: amount };
  } catch (error) {
    if (amount)
      await run(
        REFUND_CREDITS,
        `${transaction}_refund`,
        c.orgId,
        amount,
        `${action}_refund`,
        transaction,
        now(),
      );
    throw error;
  }
}
