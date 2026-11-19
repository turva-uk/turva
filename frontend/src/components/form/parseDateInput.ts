import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/** Strict British keyboard input and canonical API dates; never US fallback parsing. */
export function parseDateInput(value: string, displayFormat = "D MMMM YYYY"): string | null {
  const date = dayjs(
    value.trim(),
    [displayFormat, "DD/MM/YYYY", "D/M/YYYY", "D/MM/YYYY", "DD/M/YYYY", "YYYY-MM-DD"],
    "en",
    true,
  );
  return date.isValid() ? date.format("YYYY-MM-DD") : null;
}
