class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;

    if (details !== undefined) {
      this.details = details;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

module.exports = ApiError;
