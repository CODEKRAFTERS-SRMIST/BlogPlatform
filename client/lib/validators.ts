/**
 * Signup rules. Keep these in sync with the same checks in
 * Server/src/controllers/auth.controller.js — the API enforces them again so
 * they cannot be skipped by calling it directly.
 */

/** Only Gmail addresses may register. */
export const ALLOWED_EMAIL_DOMAIN = "gmail.com";

/** Every registration number must start with this prefix. */
export const REG_NO_PREFIX = "RA";

/** The only departments a member may pick. */
/**
 * The shortest password the server accepts, mirrored here so the browser
 * refuses the same ones it does.
 *
 * Three places used to disagree: the server wanted eight, the settings page
 * accepted six, and an unused validation module in the server said six too.
 * Six got you through the form and refused at the API.
 */
export const PASSWORD_MIN = 8;

export const DOMAIN_OPTIONS = [
  "Development",
  "Web3",
  "Cybersecurity",
  "PR and Management",
  "Content",
  "Creative",
] as const;

export type DomainOption = (typeof DOMAIN_OPTIONS)[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function normalizeRegNo(regNo: string): string {
  return typeof regNo === "string" ? regNo.trim().toUpperCase() : "";
}

/**
 * Accepts an address only when its domain is exactly gmail.com.
 * Anything else — including near-misses like gaail.com — is rejected.
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = normalizeEmail(email);

  if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  const domain = trimmed.split("@")[1];

  if (domain !== ALLOWED_EMAIL_DOMAIN) {
    return {
      valid: false,
      error: `Only @${ALLOWED_EMAIL_DOMAIN} addresses are allowed. Please change your email.`,
    };
  }

  return { valid: true };
}

export function validateRegNo(regNo: string): { valid: boolean; error?: string } {
  const trimmed = normalizeRegNo(regNo);

  if (!trimmed) {
    return { valid: false, error: "Registration number is required." };
  }

  if (!trimmed.startsWith(REG_NO_PREFIX)) {
    return {
      valid: false,
      error: `Registration number must start with ${REG_NO_PREFIX}.`,
    };
  }

  return { valid: true };
}

export function validateDomain(domain: string): { valid: boolean; error?: string } {
  const trimmed = typeof domain === "string" ? domain.trim() : "";

  if (!trimmed) {
    return { valid: false, error: "Please select your department." };
  }

  if (!(DOMAIN_OPTIONS as readonly string[]).includes(trimmed)) {
    return {
      valid: false,
      error: `Please select a department from the list: ${DOMAIN_OPTIONS.join(", ")}.`,
    };
  }

  return { valid: true };
}
