const fs = require("fs");
const path = require("path");

let cachedMessaging = undefined;

function loadFirebaseAdmin() {
  try {
    return require("firebase-admin");
  } catch (error) {
    return null;
  }
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      return null;
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const resolvedPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

    if (fs.existsSync(resolvedPath)) {
      try {
        return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
      } catch (error) {
        return null;
      }
    }
  }

  return null;
}

function getMessagingClient() {
  if (cachedMessaging !== undefined) {
    return cachedMessaging;
  }

  const admin = loadFirebaseAdmin();
  const serviceAccount = getServiceAccount();

  if (!admin || !serviceAccount) {
    cachedMessaging = null;
    return cachedMessaging;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    cachedMessaging = admin.messaging();
    return cachedMessaging;
  } catch (error) {
    cachedMessaging = null;
    return cachedMessaging;
  }
}

module.exports = {
  getMessagingClient,
};
