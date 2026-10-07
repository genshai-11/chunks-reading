export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/, // Link-local & Cloud Metadata (169.254.169.254)
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

/**
 * Validates external URL against SSRF vulnerabilities, blocking private/internal IPs and dangerous schemes.
 */
export function validateImportUrl(inputUrl: string): UrlValidationResult {
  try {
    const parsed = new URL(inputUrl);

    // Protocol check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        reason: `Unsupported protocol ${parsed.protocol}. Only HTTP and HTTPS are permitted.`,
      };
    }

    // Credentials in URL check
    if (parsed.username || parsed.password) {
      return {
        valid: false,
        reason: 'URLs with embedded credentials (username:password) are prohibited.',
      };
    }

    const hostname = parsed.hostname;

    // Check against private/loopback/metadata IP patterns
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          reason: `Target host ${hostname} is a restricted private, local, or cloud metadata address.`,
        };
      }
    }

    return {
      valid: true,
      sanitizedUrl: parsed.toString(),
    };
  } catch (err) {
    return {
      valid: false,
      reason: 'Malformed URL structure.',
    };
  }
}

/**
 * Sanitizes imported HTML or raw text into clean, safe reading text without script execution or arbitrary tags.
 */
export function sanitizeImportedText(rawInput: string): string {
  // Strip dangerous tags completely
  let text = rawInput
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // Convert paragraph and break tags into newlines
  text = text
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n');

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ');
}
