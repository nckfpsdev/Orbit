/** Convert parameters only; PostgreSQL semantics are migrated explicitly at each caller. */
export function bindQuery(source: string, args: readonly unknown[]) {
  let result = "",
    index = 0,
    quote = "",
    dollar = "",
    blockDepth = 0;
  let lineComment = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i],
      next = source[i + 1];
    if (lineComment) {
      result += c;
      if (c === "\n") lineComment = false;
    } else if (blockDepth) {
      result += c;
      if (c === "/" && next === "*") {
        result += next;
        i++;
        blockDepth++;
      } else if (c === "*" && next === "/") {
        result += next;
        i++;
        blockDepth--;
      }
    } else if (dollar) {
      if (source.startsWith(dollar, i)) {
        result += dollar;
        i += dollar.length - 1;
        dollar = "";
      } else result += c;
    } else if (quote) {
      result += c;
      if (c === quote && next === quote) {
        result += next;
        i++;
      } else if (c === quote) quote = "";
    } else if (c === "-" && next === "-") {
      result += "--";
      i++;
      lineComment = true;
    } else if (c === "/" && next === "*") {
      result += "/*";
      i++;
      blockDepth = 1;
    } else if (c === "'" || c === '"') {
      quote = c;
      result += c;
    } else if (c === "$" && /^\$(?:[a-zA-Z_][\w]*)?\$/.test(source.slice(i))) {
      dollar = source.slice(i).match(/^\$(?:[a-zA-Z_][\w]*)?\$/)![0];
      result += dollar;
      i += dollar.length - 1;
    } else if (c === "?") result += `$${++index}`;
    else result += c;
  }
  if (quote || dollar || blockDepth || index !== args.length)
    throw new Error("INVALID_SQL_PARAMETERS");
  return {
    text: result,
    values: args.map((value) => (value === undefined ? null : value)),
  };
}
export function normalizeDbRow(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value instanceof Date
        ? value.toISOString()
        : key.endsWith("_json") && value !== null && typeof value === "object"
          ? JSON.stringify(value)
          : value,
    ]),
  );
}
