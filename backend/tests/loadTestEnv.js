const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";

dotenv.config({
  path: path.resolve(__dirname, "..", envFile),
  override: true,
  quiet: true,
});
