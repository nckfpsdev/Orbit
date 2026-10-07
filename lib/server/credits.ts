import type { Context } from "./security";
import { AppError } from "./security";
import { batch, id, now } from "./db";
export async function withCredits<T>(
  c: Context,
  action: string,
  operation: () => Promise<T>,
  reference?: string,
): Promise<{ result: T; credits_used: number }> {
  const amount = c.settings.credit_costs[action] ?? 0;
  const transaction = id("credit");
  if (amount) {
    const r = await batch([
      {
        sql: "UPDATE organizations SET credits=credits-?,updated_at=? WHERE id=? AND credits>=? RETURNING credits",
        args: [amount, now(), c.orgId, amount],
      },
      {
        sql: "INSERT INTO credit_transactions (id,organization_id,amount,action,reference_id,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1",
        args: [transaction, c.orgId, -amount, action, reference ?? null, now()],
      },
    ]);
    if (!r[0]?.results?.length)
      throw new AppError(
        "INSUFFICIENT_CREDITS",
        "Saldo insuficiente para esta ação. Confira seus créditos.",
        402,
      );
  }
  try {
    return { result: await operation(), credits_used: amount };
  } catch (e) {
    if (amount)
      await batch([
        {
          sql: "INSERT OR IGNORE INTO credit_transactions (id,organization_id,amount,action,reference_id,created_at) VALUES (?,?,?,?,?,?)",
          args: [
            `${transaction}_refund`,
            c.orgId,
            amount,
            `${action}_refund`,
            transaction,
            now(),
          ],
        },
        {
          sql: "UPDATE organizations SET credits=credits+? WHERE id=? AND changes()=1",
          args: [amount, c.orgId],
        },
      ]);
    throw e;
  }
}
