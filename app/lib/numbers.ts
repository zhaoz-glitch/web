/** Parse a user-typed numeric filter value into a normalized number.
 *
 * Percentage fields (unit === "%") use fraction semantics: "10%" and "0.1"
 * both become 0.1 (ten percent). A trailing "%" divides the number by 100.
 * The backend multiplies percent-field inputs by 100 before comparing against
 * the database, which stores percentage points (6.36 == 6.36%).
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
  let isPercent = false;

  if (raw.endsWith("%")) {
    raw = raw.slice(0, -1).trim();
    isPercent = true;
    if (raw === "") {
      return { value: null, error: `'${value}' is not a valid number` };
    }
  }

  const num = Number(raw);
  if (Number.isNaN(num)) {
    return { value: null, error: `'${value}' is not a valid number` };
  }

  if (!Number.isFinite(num)) {
    return { value: null, error: `'${value}' is not a valid finite number` };
  }

  return { value: isPercent ? num / 100 : num };
}
