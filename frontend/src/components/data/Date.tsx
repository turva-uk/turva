/**
 * Date Component
 *
 * Pure formatter - returns bare text with no wrapping element.
 * Accepts canonical calendar dates (YYYY-MM-DD), not timestamp instants.
 */

type FormattedDateProps = {
  /** ISO 8601 date string (YYYY-MM-DD) from backend */
  date: string;
  /** Locale for date formatting. Defaults to 'en-GB' (British English) */
  locale?: "en-GB" | "en-US";
  /** Date format style */
  format?: "short" | "medium" | "long" | "full";
};

/**
 * FormattedDate
 *
 * Displays a formatted date with locale-specific formatting.
 *
 * @example
 * // British format: 12/05/1980
 * <FormattedDate date="1980-05-12" />
 *
 * @example
 * // American format: 5/12/1980
 * <FormattedDate date="1980-05-12" locale="en-US" />
 *
 * @example
 * // Long format: 12 May 1980
 * <FormattedDate date="1980-05-12" format="long" />
 */
export default function FormattedDate({
  date,
  locale = "en-GB",
  format = "short",
}: FormattedDateProps) {
  if (!date) {
    return null;
  }

  /* eslint-disable react-hooks/error-boundaries -- try/catch guards date parsing, not React rendering */
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("0000-")) {
      return <>Invalid date</>;
    }
    const dateObj = new globalThis.Date(`${date}T00:00:00.000Z`);

    // Date parsing can normalise impossible days into the following month.
    if (Number.isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== date) {
      return <>Invalid date</>;
    }

    const formatOptions: Intl.DateTimeFormatOptions =
      format === "short"
        ? {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }
        : format === "medium"
          ? {
              year: "numeric",
              month: "short",
              day: "numeric",
            }
          : format === "long"
            ? {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            : {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              };

    // A calendar date must not become the previous day west of UTC.
    const formattedDate = new Intl.DateTimeFormat(locale, {
      ...formatOptions,
      timeZone: "UTC",
    }).format(dateObj);

    return <>{formattedDate}</>;
  } catch (error) {
    console.error("Error formatting date:", error);
    return <>Invalid date</>;
  }
  /* eslint-enable react-hooks/error-boundaries */
}
