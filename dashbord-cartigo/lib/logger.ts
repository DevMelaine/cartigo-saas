type LogMeta = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|api[-_]?key|credential|session)/i;

function maskString(value: string, visibleStart = 2, visibleEnd = 2) {
  if (value.length <= visibleStart + visibleEnd) {
    return "*".repeat(Math.max(value.length, 4));
  }

  return [
    value.slice(0, visibleStart),
    "*".repeat(Math.max(value.length - visibleStart - visibleEnd, 4)),
    value.slice(-visibleEnd),
  ].join("");
}

function maskEmail(value: string) {
  if (!value.includes("@")) {
    return maskString(value);
  }

  const [localPart, domain] = value.split("@");
  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 4))}@${domain}`;
}

function maskPhone(value: string) {
  return maskString(value, 2, 2);
}

function sanitize(value: unknown, key = ""): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, key));
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [k, v]) => {
      acc[k] = sanitize(v, k);
      return acc;
    }, {});
  }

  if (typeof value === "string") {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return maskString(value);
    }

    if (/email/i.test(key)) {
      return maskEmail(value);
    }

    if (/phone/i.test(key)) {
      return maskPhone(value);
    }
  }

  return value;
}

function log(level: "info" | "warn" | "error" | "debug", message: string, meta?: LogMeta) {
  const payload = meta ? sanitize(meta) : undefined;
  const output = payload ? [message, payload] : [message];

  switch (level) {
    case "error":
      console.error(...output);
      break;
    case "warn":
      console.warn(...output);
      break;
    case "debug":
      console.debug(...output);
      break;
    default:
      console.info(...output);
  }
}

export const appLogger = {
  info(message: string, meta?: LogMeta) {
    log("info", message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    log("warn", message, meta);
  },
  error(message: string, meta?: LogMeta) {
    log("error", message, meta);
  },
  debug(message: string, meta?: LogMeta) {
    log("debug", message, meta);
  },
};
