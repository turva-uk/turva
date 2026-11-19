/**
 * Email validation pattern for use with React Hook Form's `register`.
 *
 * @example
 * ```tsx
 * <EmailField
 *   label="Email"
 *   {...methods.register("email", {
 *     required: true,
 *     pattern: EMAIL_PATTERN,
 *   })}
 *   error={errors.email?.message as string | undefined}
 *   required
 * />
 * ```
 */
export const EMAIL_PATTERN = {
  value: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/,
  message: "Please enter a valid email address",
} as const;
