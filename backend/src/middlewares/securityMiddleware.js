const helmet = require("helmet");

function securityMiddleware(app) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
}

module.exports = securityMiddleware;

