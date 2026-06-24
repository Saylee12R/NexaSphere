const DEFAULT_MASK_PATTERNS = [
  { key: /password/i, mask: '***' },
  { key: /token/i, mask: '***' },
  { key: /secret/i, mask: '***' },
  { key: /api[_-]?key/i, mask: '***' },
  { key: /authorization/i, mask: '***' },
  { key: /credit[_-]?card/i, mask: '****-****-****-****' },
  { key: /card[_-]?number/i, mask: '****-****-****-****' },
  { key: /cvv/i, mask: '***' },
  { key: /ssn/i, mask: '***-**-****' },
  { key: /social[_-]?security/i, mask: '***-**-****' },
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const IP_REGEX = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone) {
  return phone.replace(/\d(?=\d{4})/g, '*');
}

function maskIP(ip) {
  return ip.replace(/\d+$/g, '***');
}

function isSensitiveKey(key) {
  return DEFAULT_MASK_PATTERNS.some((p) => p.key.test(key));
}

function getMaskForValue(value) {
  if (typeof value !== 'string') return null;
  if (EMAIL_REGEX.test(value)) return value.replace(EMAIL_REGEX, (m) => maskEmail(m));
  PHONE_REGEX.lastIndex = 0;
  if (PHONE_REGEX.test(value)) return value.replace(PHONE_REGEX, (m) => maskPhone(m));
  IP_REGEX.lastIndex = 0;
  if (IP_REGEX.test(value)) return value.replace(IP_REGEX, (m) => maskIP(m));
  return null;
}

export function maskSensitiveData(obj, options = {}) {
  const { maskChar = '***', customPatterns = [], deep = true } = options;
  const allPatterns = [...DEFAULT_MASK_PATTERNS, ...customPatterns];

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    let result = obj;
    for (const pattern of allPatterns) {
      if (pattern.key.test(result)) {
        return maskChar;
      }
    }
    const maskedValue = getMaskForValue(result);
    return maskedValue || result;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item, options));
  }

  if (typeof obj === 'object') {
    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
      const shouldMaskKey = allPatterns.some((p) => p.key.test(key));
      if (shouldMaskKey) {
        masked[key] = maskChar;
      } else if (deep && typeof value === 'object' && value !== null) {
        masked[key] = maskSensitiveData(value, options);
      } else if (typeof value === 'string') {
        const maskedValue = getMaskForValue(value);
        masked[key] = maskedValue || value;
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return obj;
}

export function createMaskingTransform(options = {}) {
  return {
    transform(info) {
      info.context = maskSensitiveData(info.context, options);
      if (info.data) info.data = maskSensitiveData(info.data, options);
      if (info.meta) info.meta = maskSensitiveData(info.meta, options);
      return info;
    },
  };
}
