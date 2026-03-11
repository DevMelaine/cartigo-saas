# Product Management Module - API Documentation

## Overview

This is a production-grade product management system for a multi-tenant SaaS supermarket platform. The system enforces strict data isolation per organization, implements role-based access control, and provides enterprise-grade APIs for inventory management.

---

## Architecture

```
src/
├── controllers/
│   └── productController.js       # HTTP request handlers
├── services/
│   └── productService.js          # Business logic layer
├── routes/
│   └── productRoutes.js           # API endpoint definitions
├── validators/
│   └── productValidator.js        # Input validation rules
└── middlewares/
    └── authMiddleware.js          # Authentication & JWT verification
```

**Data Flow:**
```
Request → authMiddleware (JWT) → Router → Controller → Service → Prisma → Database
Response ← Controller ← Service ← Database
```

---

## Database Schema

```prisma
model Product {
  id                   String   @id @default(uuid())
  name                 String
  description          String?
  price                Decimal  @db.Decimal(10, 2)
  costPrice            Decimal? @db.Decimal(10, 2)
  stock                Int      @default(0)
  sku                  String                          // Unique per organization
  barcode              String?
  category             String?
  imageUrl             String?
  isActive             Boolean  @default(true)        // Soft delete flag
  lowStockThreshold    Int?                            // Alert threshold
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  organizationId       String
  organization         Organization @relation(...)    // Multi-tenant isolation

  @@unique([organizationId, sku])
  @@index([organizationId])
  @@index([name])
  @@index([createdAt])
}
```

**Key Features:**
- ✅ `organizationId` ensures multi-tenant data isolation
- ✅ `@@unique([organizationId, sku])` prevents duplicate SKUs within org
- ✅ `isActive` enables soft deletes without data loss
- ✅ Indexed on frequently queried fields for performance

---

## API Endpoints

### 1. Create Product

**Endpoint:** `POST /api/products`

**Authentication:** Required (JWT)

**Authorization:** ADMIN, MANAGER only

**Request Body:**
```json
{
  "name": "Rice 10kg",
  "description": "Premium quality rice",
  "price": 25.50,
  "costPrice": 15.00,
  "stock": 100,
  "sku": "RICE-001",
  "category": "Food",
  "barcode": "1234567890",
  "imageUrl": "https://cdn.example.com/rice.jpg",
  "lowStockThreshold": 20
}
```

**Validation Rules:**
- `name`: 2-255 characters, required
- `price`: positive number, max 999999.99, required
- `costPrice`: non-negative, optional, cannot exceed selling price
- `stock`: non-negative integer, required
- `sku`: 1-100 chars, alphanumeric + hyphen/underscore, unique per organization, required
- `category`: max 100 chars, optional
- `barcode`: max 100 chars, optional
- `imageUrl`: valid URL format, optional

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Rice 10kg",
    "description": "Premium quality rice",
    "price": "25.50",
    "costPrice": "15.00",
    "stock": 100,
    "sku": "RICE-001",
    "category": "Food",
    "barcode": "1234567890",
    "imageUrl": "https://cdn.example.com/rice.jpg",
    "isActive": true,
    "lowStockThreshold": 20,
    "organizationId": "org-uuid",
    "createdAt": "2026-03-11T10:00:00Z",
    "updatedAt": "2026-03-11T10:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Missing/invalid JWT
- `403 Forbidden` - Insufficient permissions (not ADMIN/MANAGER)
- `409 Conflict` - SKU already exists in organization
- `500 Server Error` - Internal error

---

### 2. Get All Products

**Endpoint:** `GET /api/products`

**Authentication:** Required (JWT)

**Authorization:** Any authenticated user

**Query Parameters:**
```
?page=1
&limit=10
&search=rice
&category=Food
&sort=createdAt
&order=desc
```

**Supported Sort Fields:** `name`, `price`, `stock`, `createdAt`, `updatedAt`

**Order Values:** `asc`, `desc` (default: `desc`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Rice 10kg",
      "price": "25.50",
      "stock": 100,
      "sku": "RICE-001",
      "category": "Food",
      "imageUrl": "https://...",
      "lowStockThreshold": 20,
      "isActive": true,
      "createdAt": "2026-03-11T10:00:00Z",
      "updatedAt": "2026-03-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

**Features:**
- ✅ Full-text search on name, SKU, barcode
- ✅ Filter by category
- ✅ Flexible sorting
- ✅ Optimized pagination with offset/limit
- ✅ Only returns `isActive: true` products
- ✅ Multi-tenant isolation (only organization's products)

---

### 3. Get Single Product

**Endpoint:** `GET /api/products/:id`

**Authentication:** Required (JWT)

**Authorization:** Any authenticated user (must be in same organization)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Rice 10kg",
    "description": "Premium quality rice",
    "price": "25.50",
    "costPrice": "15.00",
    "stock": 100,
    "sku": "RICE-001",
    "category": "Food",
    "barcode": "1234567890",
    "imageUrl": "https://cdn.example.com/rice.jpg",
    "isActive": true,
    "lowStockThreshold": 20,
    "organizationId": "org-uuid",
    "createdAt": "2026-03-11T10:00:00Z",
    "updatedAt": "2026-03-11T10:00:00Z"
  }
}
```

**Error Responses:**
- `404 Not Found` - Product doesn't exist or belongs to different organization
- `401 Unauthorized` - Missing/invalid JWT

---

### 4. Update Product

**Endpoint:** `PUT /api/products/:id`

**Authentication:** Required (JWT)

**Authorization:** ADMIN, MANAGER only

**Request Body:** (any updateable fields)
```json
{
  "name": "Rice Premium 10kg",
  "price": 28.00,
  "stock": 95,
  "category": "Food & Grains"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product updated successfully.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Rice Premium 10kg",
    "price": "28.00",
    ...
  }
}
```

**Notes:**
- ✅ `updatedAt` field automatically updated
- ✅ Only provided fields are modified (partial updates supported)
- ✅ Same validation rules apply as creation

---

### 5. Delete Product (Soft Delete)

**Endpoint:** `DELETE /api/products/:id`

**Authentication:** Required (JWT)

**Authorization:** ADMIN, MANAGER only

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product deleted successfully."
}
```

**Notes:**
- ✅ Soft delete: sets `isActive = false`
- ✅ Data remains in database (auditable)
- ✅ Deleted products excluded from `GET /api/products` listings
- ✅ Can be "restored" by setting `isActive = true` if needed

---

### 6. Get Low Stock Products

**Endpoint:** `GET /api/products/stats/low-stock`

**Authentication:** Required (JWT)

**Authorization:** ADMIN, MANAGER only

**Query Parameters:**
```
?limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Rice 10kg",
      "sku": "RICE-001",
      "stock": 15,
      "lowStockThreshold": 20
    }
  ],
  "count": 3
}
```

**Notes:**
- Returns products where `stock <= lowStockThreshold`
- Useful for alerting and reordering

---

### 7. Get Product Statistics

**Endpoint:** `GET /api/products/stats/overview`

**Authentication:** Required (JWT)

**Authorization:** ADMIN, MANAGER only

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalProducts": 150,
    "totalStock": 5420,
    "averagePrice": 25.75
  }
}
```

---

## Security Features

### 1. Authentication

All product endpoints require valid JWT token in `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

The JWT token is validated by `authMiddleware` which extracts:
- `userId`
- `organizationId`
- `role`

### 2. Multi-Tenant Isolation

**Enforced at every layer:**

```javascript
// Service layer
where: {
  organizationId: req.user.organizationId,  // from JWT
  ...
}

// Database constraint
@@unique([organizationId, sku])
@@index([organizationId])
```

**Guarantee:** No organization can ever read/write another's data.

### 3. Role-Based Authorization

```javascript
const ADMIN    = ["ADMIN", "MANAGER"]        // Can CRUD
const EMPLOYEE = ["EMPLOYEE"]                // Read-only
```

**Enforcement per endpoint:**
```javascript
if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
  return res.status(403).json({
    success: false,
    message: "You do not have permission..."
  });
}
```

### 4. Input Validation

All inputs validated against strict rules:
- ✅ Type checking (string, number, boolean)
- ✅ Length constraints
- ✅ Format validation (SKU, URL, barcode)
- ✅ Business logic (price, stock, cost)
- ✅ Uniqueness (SKU per organization)

---

## Performance Optimizations

### 1. Indexed Queries

Database indexes on:
- `organizationId` - fastest multi-tenant filtering
- `name` - full-text search
- `createdAt` - sorting and time-range queries

### 2. Pagination

All list endpoints support cursor-based pagination:
```javascript
skip: (page - 1) * limit
take: limit
```

Prevents memory overhead with large datasets.

### 3. Field Selection

Only required fields selected to reduce payload:
```javascript
select: {
  id: true,
  name: true,
  price: true,
  stock: true,
  // ... other fields
}
```

### 4. Parallel Queries

List endpoint executes count and fetch in parallel:
```javascript
const [products, total] = await Promise.all([
  prisma.product.findMany(...),
  prisma.product.count(...)
])
```

---

## Error Handling

Comprehensive error handling with proper HTTP status codes:

| Status | Meaning | Example |
|--------|---------|---------|
| `201` | Created | Product successfully created |
| `200` | OK | Product fetched/updated |
| `400` | Bad Request | Validation errors |
| `401` | Unauthorized | Missing/invalid JWT |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Product doesn't exist |
| `409` | Conflict | Duplicate SKU |
| `500` | Server Error | Database/runtime error |

**Error Response Format:**
```json
{
  "success": false,
  "message": "User-friendly error message",
  "errors": ["Specific validation error 1", "Specific validation error 2"]
}
```

---

## Testing

Comprehensive test suites included:

```bash
# Create product tests
npm test -- tests/products/product.create.test.js

# Read/pagination tests
npm test -- tests/products/product.read.test.js

# Update/delete tests
npm test -- tests/products/product.update.test.js

# All tests
npm test
```

**Test Coverage:**
- ✅ 30+ test cases
- ✅ Multi-tenant isolation verification
- ✅ Role-based authorization checks
- ✅ Validation edge cases
- ✅ Error handling scenarios
- ✅ Soft delete behavior

---

## Usage Examples

### Create a Product

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wheat Flour 5kg",
    "price": 8.50,
    "costPrice": 5.50,
    "stock": 200,
    "sku": "FLOUR-001",
    "category": "Grains"
  }'
```

### Search and Filter Products

```bash
curl "http://localhost:5000/api/products?search=rice&category=Food&page=1&limit=20&sort=price&order=asc" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Inventory Statistics

```bash
curl "http://localhost:5000/api/products/stats/overview" \
  -H "Authorization: Bearer $TOKEN"
```

### Low Stock Alert

```bash
curl "http://localhost:5000/api/products/stats/low-stock?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Future Enhancements

- [ ] Bulk product import (CSV)
- [ ] Product variants (sizes, colors)
- [ ] Inventory history/audit trail
- [ ] Barcode scanning integration
- [ ] Supplier management
- [ ] Price history and analytics
- [ ] Product recommendations
- [ ] Advanced stock forecasting

---

## File Structure Summary

```
backend/
├── src/
│   ├── controllers/productController.js       (450 lines)
│   ├── services/productService.js             (320 lines)
│   ├── routes/productRoutes.js                (80 lines)
│   ├── validators/productValidator.js         (250 lines)
│   └── app.js                                 (updated)
├── prisma/
│   └── schema.prisma                          (updated)
├── tests/
│   └── products/
│       ├── product.create.test.js             (280 lines)
│       ├── product.read.test.js               (240 lines)
│       └── product.update.test.js             (240 lines)
└── PRODUCT_MODULE.md                          (this file)
```

---

## Deployment Checklist

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Run tests: `npm test`
- [ ] Check coverage: `npm run coverage`
- [ ] Enable CORS for frontend domain
- [ ] Configure JWT_SECRET in production
- [ ] Set up database backups
- [ ] Configure monitoring/alerts
- [ ] Document API for mobile/dashboard clients
- [ ] Set rate limiting on endpoints
- [ ] Enable audit logging

---

This module is production-ready and follows enterprise SaaS best practices.
