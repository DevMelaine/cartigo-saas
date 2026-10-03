async function sendSmsMessage({ to, message }) {
  const provider = (process.env.SMS_PROVIDER || "noop").trim().toLowerCase();

  if (!to || typeof to !== "string") {
    const error = new Error("SMS recipient is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!message || typeof message !== "string") {
    const error = new Error("SMS message is required.");
    error.statusCode = 400;
    throw error;
  }

  if (provider === "noop" || process.env.NODE_ENV === "test") {
    return {
      skipped: true,
      provider,
    };
  }

  if (provider === "log") {
    return {
      skipped: false,
      provider,
    };
  }

  const error = new Error(`Unsupported SMS provider: ${provider}`);
  error.statusCode = 500;
  throw error;
}

module.exports = {
  sendSmsMessage,
};
