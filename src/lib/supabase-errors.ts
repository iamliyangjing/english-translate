export const isMissingColumnError = (message?: string | null) =>
  Boolean(message && /column .* does not exist/i.test(message));
