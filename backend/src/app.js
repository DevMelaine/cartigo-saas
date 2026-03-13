const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const customerRoutes = require("./routes/customerRoutes");
const securityMiddleware = require("./middlewares/securityMiddleware");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();

app.use(cors());
app.use(express.json());

securityMiddleware(app);

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);

// swagger documentation endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.json({
    message: "Supermarket SaaS API running",
  });
});

module.exports = app;