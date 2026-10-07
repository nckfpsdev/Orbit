export const RESERVE_CREDITS = `
WITH debit AS (
  UPDATE organizations SET credits=credits-?,updated_at=?
  WHERE id=? AND credits>=? RETURNING id,credits
), ledger AS (
  INSERT INTO credit_transactions (id,organization_id,amount,action,reference_id,created_at)
  SELECT ?,id,?,?,?,? FROM debit RETURNING organization_id
)
SELECT debit.credits FROM debit JOIN ledger ON ledger.organization_id=debit.id`;

export const REFUND_CREDITS = `
WITH refund AS (
  INSERT INTO credit_transactions (id,organization_id,amount,action,reference_id,created_at)
  VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING organization_id,amount
)
UPDATE organizations SET credits=credits+refund.amount
FROM refund WHERE organizations.id=refund.organization_id`;

export const UPDATE_WEBSITE_VERSION = `
WITH updated AS (
  UPDATE generated_websites SET content_json=?,version=version+1,updated_at=?
  WHERE id=? AND organization_id=? AND version=?
  RETURNING id,organization_id,version,content_json
)
INSERT INTO website_versions (id,organization_id,website_id,version,content_json,change_note,created_at)
SELECT ?,organization_id,id,version,content_json,?,? FROM updated RETURNING id`;
