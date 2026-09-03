/** Parse a user-typed numeric filter value into a normalized number.
 *
 * Percentage fields (unit === "%") accept both bare numbers and numbers with a
 * trailing percent sign: "10%" and "10" both become 10, because the database
 * stores these metrics as percentages already. "0.1" becomes 0.1.
 *
 * Empty strings are treated as "not set" (value: null, no error).
 * Garbage like "abc" returns an error message.
 */
export function parseNumericInput(
  value: string,
  unit?: string,
): { value: number | null; error?: string } {
  const trimmed = value.trim();
  if (trimmed === "") return { value: null };

  let raw = trimmed;

  // Strip an explicit trailing percent sign regardless of declared unit,
  // so "10%" works everywhere the user thinks to type it.
  if (raw.endsWith("%")) {
    raw = raw.slice(0, -1).trim();
  }

  const num = Number(raw);
  if (Number.isNaN(num)) {
    return { value: null, error: `'${value}' is not a valid number` };
  }

  if (!Number.isFinite(num)) {
    return { value: null, error: `'${value}' is not a valid finite number` };
  }

  return { value: num };
}
