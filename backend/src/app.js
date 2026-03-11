const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const productRoutes = require("./routes/productRoutes");
const securityMiddleware = require("./middlewares/securityMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

securityMiddleware(app);

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/products", productRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Supermarket SaaS API running",
  });
});

module.exports = app;