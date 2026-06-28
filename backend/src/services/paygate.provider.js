const { PaymentStatus } = require("@prisma/client");

const DEFAULT_PAYGATE_BASE_URL = "https://paygateglobal.com";
const DEFAULT_CALLBACK_URL = "http://localhost:3000/api/payments/paygate/webhook";

class PayGateProvider {
  get apiKey() {
    return process.env.PAYGATE_API_KEY;
  }

  get baseUrl() {
    return process.env.PAYGATE_BASE_URL || DEFAULT_PAYGATE_BASE_URL;
  }

  get callbackUrl() {
    if (process.env.PAYGATE_CALLBACK_URL) {
      return process.env.PAYGATE_CALLBACK_URL;
    }

    if (process.env.APP_BASE_URL) {
      return `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/payments/paygate/webhook`;
    }

    return DEFAULT_CALLBACK_URL;
  }

  assertConfigured() {
    if (!this.apiKey) {
      const error = new Error("PAYGATE_API_KEY is not configured.");
      error.statusCode = 500;
      throw error;
    }
  }

  generatePaymentUrl({ amount, identifier, description, callbackUrl }) {
    this.assertConfigured();

    const url = new URL("/v1/page", this.baseUrl);
    url.searchParams.set("token", this.apiKey);
    url.searchParams.set("amount", String(amount));
    url.searchParams.set("identifier", identifier);
    url.searchParams.set("description", description);
    url.searchParams.set("url", callbackUrl || this.callbackUrl);

    return url.toString();
  }

  async fetchStatus({ identifier }) {
    this.assertConfigured();

    if (typeof fetch !== "function") {
      const error = new Error("Fetch API is not available in this runtime.");
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(new URL("/api/v2/status", this.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        auth_token: this.apiKey,
        identifier,
      }),
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(payload && payload.message ? payload.message : "Unable to verify PayGate payment status.");
      error.statusCode = 502;
      error.details = payload;
      throw error;
    }

    return payload;
  }

  normalizeStatus(payload) {
    const rawStatus =
      payload?.status ??
      payload?.code ??
      payload?.payment_status ??
      payload?.data?.status ??
      payload?.data?.code ??
      payload;

    const providerStatusCode = Number(rawStatus);

    if (!Number.isFinite(providerStatusCode)) {
      const error = new Error("Unexpected PayGate status response.");
      error.statusCode = 502;
      error.details = payload;
      throw error;
    }

    let localStatus;

    switch (providerStatusCode) {
      case 0:
        localStatus = PaymentStatus.SUCCESS;
        break;
      case 2:
        localStatus = PaymentStatus.PENDING;
        break;
      case 4:
      case 6:
        localStatus = PaymentStatus.FAILED;
        break;
      default: {
        const error = new Error(`Unsupported PayGate status code: ${providerStatusCode}`);
        error.statusCode = 502;
        error.details = payload;
        throw error;
      }
    }

    return {
      localStatus,
      providerStatusCode,
      amount: payload?.amount ?? payload?.data?.amount ?? null,
      paymentReference:
        payload?.payment_reference ??
        payload?.data?.payment_reference ??
        payload?.tx_reference ??
        payload?.data?.tx_reference ??
        null,
      method: payload?.payment_method ?? payload?.data?.payment_method ?? null,
      raw: payload,
    };
  }
}

module.exports = new PayGateProvider();
module.exports.PayGateProvider = PayGateProvider;
