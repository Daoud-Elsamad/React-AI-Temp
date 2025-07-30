import DOMPurify from 'dompurify';
import { z } from 'zod';

// HTML sanitization for user content
export class HTMLSanitizer {
  private static defaultConfig = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'a', 'img'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  };

  private static strictConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  };

  /**
   * Sanitize HTML content for safe display
   */
  static sanitizeHTML(html: string, strict = false): string {
    if (!html || typeof html !== 'string') return '';
    
    const config = strict ? this.strictConfig : this.defaultConfig;
    return DOMPurify.sanitize(html, config);
  }

  /**
   * Strip all HTML tags and return plain text
   */
  static stripHTML(html: string): string {
    if (!html || typeof html !== 'string') return '';
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }

  /**
   * Sanitize for safe attribute values
   */
  static sanitizeAttribute(value: string): string {
    if (!value || typeof value !== 'string') return '';
    // Remove dangerous patterns
    return value
      .replace(/[<>'"]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .trim();
  }
}

// Input sanitization utilities
export class InputSanitizer {
  /**
   * Sanitize text input by removing dangerous characters
   */
  static sanitizeText(input: string, options: {
    maxLength?: number;
    allowHtml?: boolean;
    strict?: boolean;
  } = {}): string {
    if (!input || typeof input !== 'string') return '';

    const { maxLength = 10000, allowHtml = false, strict = false } = options;
    let sanitized = input.trim();

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    if (allowHtml) {
      sanitized = HTMLSanitizer.sanitizeHTML(sanitized, strict);
    } else {
      sanitized = HTMLSanitizer.stripHTML(sanitized);
      // Remove potential script injections
      sanitized = sanitized
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '');
    }

    return sanitized;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '';
    return email
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, '')
      .substring(0, 254); // RFC email length limit
  }

  /**
   * Sanitize URL input
   */
  static sanitizeURL(url: string): string {
    if (!url || typeof url !== 'string') return '';
    
    // Remove dangerous protocols
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl.startsWith('javascript:') || 
        cleanUrl.startsWith('data:') || 
        cleanUrl.startsWith('vbscript:') ||
        cleanUrl.startsWith('file:')) {
      return '';
    }

    try {
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      // If not a valid URL, return empty string
      return '';
    }
  }

  /**
   * Sanitize file name for safe storage
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') return '';
    
    return fileName
      .trim()
      .replace(/[^\w\s.-]/g, '') // Allow only word chars, spaces, dots, hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/\.+/g, '.') // Remove multiple dots
      .substring(0, 255); // Limit length
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: string | number, options: {
    min?: number;
    max?: number;
    allowFloat?: boolean;
  } = {}): number | null {
    const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, allowFloat = true } = options;
    
    let num: number;
    if (typeof input === 'string') {
      num = allowFloat ? parseFloat(input) : parseInt(input, 10);
    } else {
      num = input;
    }

    if (isNaN(num) || num < min || num > max) {
      return null;
    }

    return num;
  }
}

// SQL injection prevention helpers
export class SQLSanitizer {
  private static dangerousPatterns = [
    /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SCRIPT|SELECT|UNION|UPDATE)\b)/gi,
    /(--|\||;|\/\*|\*\/|xp_|sp_)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('|"|`)/g
  ];

  /**
   * Check if input contains potential SQL injection patterns
   */
  static containsSQLInjection(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    
    return this.dangerousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize input for SQL queries (basic level - prefer parameterized queries)
   */
  static sanitizeForSQL(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/"/g, '""') // Escape double quotes
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comment start
      .replace(/\*\//g, ''); // Remove block comment end
  }
}

// Content Security Policy utilities
export class CSPUtils {
  private static nonces = new Map<string, string>();

  /**
   * Generate a cryptographically secure nonce
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get or create nonce for a specific context
   */
  static getNonce(context: string = 'default'): string {
    if (!this.nonces.has(context)) {
      this.nonces.set(context, this.generateNonce());
    }
    return this.nonces.get(context)!;
  }

  /**
   * Clear nonces (call this on page navigation)
   */
  static clearNonces(): void {
    this.nonces.clear();
  }

  /**
   * Build CSP header value
   */
  static buildCSPHeader(options: {
    scriptNonce?: string;
    styleNonce?: string;
    allowInlineStyles?: boolean;
    allowInlineScripts?: boolean;
    allowedDomains?: string[];
  } = {}): string {
    const {
      scriptNonce,
      styleNonce,
      allowInlineStyles = false,
      allowInlineScripts = false,
      allowedDomains = []
    } = options;

    const directives: string[] = [
      "default-src 'self'",
      `script-src 'self' ${scriptNonce ? `'nonce-${scriptNonce}'` : ''} ${allowInlineScripts ? "'unsafe-inline'" : ''}`,
      `style-src 'self' ${styleNonce ? `'nonce-${styleNonce}'` : ''} ${allowInlineStyles ? "'unsafe-inline'" : ''}`,
      "img-src 'self' data: https:",
      "font-src 'self' https:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "media-src 'self'",
    ];

    if (allowedDomains.length > 0) {
      const domains = allowedDomains.join(' ');
      directives[1] += ` ${domains}`;
      directives[2] += ` ${domains}`;
    }

    return directives.join('; ');
  }
}

// Rate limiting detection and handling
export interface RateLimitInfo {
  isLimited: boolean;
  retryAfter?: number;
  requestsRemaining?: number;
  windowReset?: Date;
  message: string;
}

export class RateLimitHandler {
  /**
   * Parse rate limit information from error or headers
   */
  static parseRateLimitInfo(error: any, headers?: Record<string, string>): RateLimitInfo {
    // Check if it's a rate limit error
    if (error?.code === 'RATE_LIMIT_EXCEEDED') {
      return {
        isLimited: true,
        retryAfter: error.details?.retryAfter,
        message: error.message || 'Too many requests. Please try again later.'
      };
    }

    // Check headers for rate limit info
    if (headers) {
      const remaining = headers['x-ratelimit-remaining'];
      const reset = headers['x-ratelimit-reset'];
      const retryAfter = headers['retry-after'];

      if (remaining === '0' || retryAfter) {
        return {
          isLimited: true,
          retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
          requestsRemaining: remaining ? parseInt(remaining) : 0,
          windowReset: reset ? new Date(parseInt(reset) * 1000) : undefined,
          message: 'Rate limit exceeded. Please wait before making more requests.'
        };
      }
    }

    return {
      isLimited: false,
      message: 'Request successful'
    };
  }

  /**
   * Format user-friendly rate limit message
   */
  static formatRateLimitMessage(info: RateLimitInfo): string {
    if (!info.isLimited) return info.message;

    if (info.retryAfter) {
      const minutes = Math.ceil(info.retryAfter / 60);
      if (minutes > 1) {
        return `Too many requests. Please wait ${minutes} minutes before trying again.`;
      } else {
        return `Too many requests. Please wait ${info.retryAfter} seconds before trying again.`;
      }
    }

    if (info.windowReset) {
      const timeUntilReset = Math.ceil((info.windowReset.getTime() - Date.now()) / 1000 / 60);
      return `Rate limit exceeded. Limit resets in ${timeUntilReset} minutes.`;
    }

    return info.message;
  }
}

// Enhanced validation schemas with security checks
export const secureValidationSchemas = {
  // Secure text input that prevents XSS
  secureText: (maxLength = 1000) => z
    .string()
    .max(maxLength, `Text must be less than ${maxLength} characters`)
    .refine(
      (val) => !SQLSanitizer.containsSQLInjection(val),
      'Input contains potentially dangerous content'
    )
    .transform((val) => InputSanitizer.sanitizeText(val, { maxLength })),

  // Secure HTML content
  secureHTML: (maxLength = 5000, strict = false) => z
    .string()
    .max(maxLength, `Content must be less than ${maxLength} characters`)
    .transform((val) => InputSanitizer.sanitizeText(val, { 
      maxLength, 
      allowHtml: true, 
      strict 
    })),

  // Secure email
  secureEmail: z
    .string()
    .email('Invalid email format')
    .transform((val) => InputSanitizer.sanitizeEmail(val)),

  // Secure URL
  secureURL: z
    .string()
    .url('Invalid URL format')
    .transform((val) => InputSanitizer.sanitizeURL(val))
    .refine((val) => val !== '', 'URL is not allowed'),

  // Secure file name
  secureFileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .transform((val) => InputSanitizer.sanitizeFileName(val))
    .refine((val) => val !== '', 'Invalid file name'),

  // Secure number
  secureNumber: (min?: number, max?: number) => z
    .union([z.string(), z.number()])
    .transform((val) => InputSanitizer.sanitizeNumber(val, { min, max }))
    .refine((val) => val !== null, 'Invalid number'),
};

// Security context for components
export interface SecurityContext {
  allowHTML: boolean;
  strict: boolean;
  maxLength: number;
  sanitizeInput: boolean;
}

export const createSecurityContext = (overrides: Partial<SecurityContext> = {}): SecurityContext => ({
  allowHTML: false,
  strict: true,
  maxLength: 1000,
  sanitizeInput: true,
  ...overrides,
}); 