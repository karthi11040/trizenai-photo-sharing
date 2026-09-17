/**
 * Email and Phone Normalization Utilities for Global Identity Uniqueness
 */

/**
 * Normalizes email address:
 * 1. Trim whitespace
 * 2. Convert to lowercase
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Normalizes phone number:
 * 1. Trim whitespace
 * 2. Remove spaces, hyphens, parentheses, dots
 * 3. Standardize international leading formatting
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned) return "";

  // Standardize national vs international format
  if (cleaned.startsWith("00")) {
    return `+${cleaned.substring(2)}`;
  }
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    // e.g. 09876543210 -> +919876543210 or standard 10 digit national
    return `+91${cleaned.substring(1)}`;
  }
  if (!cleaned.startsWith("+") && cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return cleaned;
}
