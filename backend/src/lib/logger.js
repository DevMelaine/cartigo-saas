let winston = null;

try {
  winston = require("winston");
} catch (error) {
  winston = null;
}

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|api[-_]?key|credential|session)/i;

function maskString(value, visibleStart = 2, visibleEnd = 2) {
  if (typeof value !== "string") {
    return value;
  }

  if (value.length <= visibleStart + visibleEnd) {
    return "*".repeat(Math.max(value.length, 4));
  }

  return [
    value.slice(0, visibleStart),
    "*".repeat(Math.max(value.length - visibleStart - visibleEnd, 4)),
    value.slice(-visibleEnd),
  ].join("");
}

function maskEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) {
    return maskString(email);
  }

  const [localPart, domain] = email.split("@");
  const visibleLocal = localPart.slice(0, 2);

  return `${visibleLocal}${"*".repeat(Math.max(localPart.length - 2, 4))}@${domain}`;
}

function maskPhone(phone) {
  return maskString(phone, 2, 2);
}

function sanitizeForLogs(value, key = "") {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogs(item, key));
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((accumulator, [currentKey, currentValue]) => {
      accumulator[currentKey] = sanitizeForLogs(currentValue, currentKey);
      return accumulator;
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

function writeConsole(level, message, meta) {
  const output = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };

  const serialized = JSON.stringify(output);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

function createFallbackLogger() {
  return {
    info(message, meta = {}) {
      writeConsole("info", message, meta);
    },
    warn(message, meta = {}) {
      writeConsole("warn", message, meta);
    },
    error(message, meta = {}) {
      writeConsole("error", message, meta);
    },
    debug(message, meta = {}) {
      if ((process.env.LOG_LEVEL || "info") === "debug") {
        writeConsole("debug", message, meta);
      }
    },
  };
}

const baseLogger = winston
  ? winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      defaultMeta: {
        service: "cartigo-backend",
      },
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({
          stack: true,
        }),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()],
    })
  : createFallbackLogger();

const logger = {
  info(message, meta = {}) {
    baseLogger.info(message, sanitizeForLogs(meta));
  },
  warn(message, meta = {}) {
    baseLogger.warn(message, sanitizeForLogs(meta));
  },
  error(message, meta = {}) {
    baseLogger.error(message, sanitizeForLogs(meta));
  },
  debug(message, meta = {}) {
    if (typeof baseLogger.debug === "function") {
      baseLogger.debug(message, sanitizeForLogs(meta));
    }
  },
};

module.exports = {
  logger,
  sanitizeForLogs,
  maskEmail,
  maskPhone,
  isWinstonAvailable: Boolean(winston),
};
