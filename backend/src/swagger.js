const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cartigo SaaS API",
      version: "1.0.0",
      description: "API documentation for Cartigo SaaS backend",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Validation failed",
            },
            errors: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 42 },
            totalPages: { type: "integer", example: 3 },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Organization authentication endpoints" },
      { name: "Customers", description: "Customer authentication and profile endpoints" },
      { name: "Users", description: "Organization staff management endpoints" },
      { name: "Products", description: "Organization product management endpoints" },
      { name: "Categories", description: "Organization product category management endpoints" },
      { name: "Inventory", description: "Inventory management endpoints" },
      { name: "Cart", description: "Customer cart endpoints" },
      { name: "Orders", description: "Order management and checkout endpoints" },
      { name: "Payments", description: "Payment creation, webhook, and status endpoints" },
      { name: "Notifications", description: "Notification inbox and device registration endpoints" },
      { name: "Public", description: "Public customer discovery endpoints" },
      { name: "OrganizationCategories", description: "Read-only organization category endpoints" },
      { name: "Test", description: "Internal test endpoints" },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
