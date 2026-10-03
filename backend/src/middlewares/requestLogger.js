const { logger } = require("../lib/logger");

function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = req.headers["x-request-id"] || undefined;

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logger.info("HTTP request completed.", {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
}

module.exports = requestLogger;
