# Public Discovery Postman Examples

Base URL:

`{{baseUrl}} = http://localhost:5000`

## 1. List public organization categories

- Method: `GET`
- URL: `{{baseUrl}}/api/public/categories`

## 2. List public organizations

- Method: `GET`
- URL: `{{baseUrl}}/api/public/organizations`
- Query params:
  - `categoryId=11111111-1111-1111-1111-111111111111`
  - `page=1`
  - `limit=20`

Example:

`{{baseUrl}}/api/public/organizations?categoryId=11111111-1111-1111-1111-111111111111&page=1&limit=20`

## 3. List products for one public organization

- Method: `GET`
- URL: `{{baseUrl}}/api/public/organizations/:organizationId/products`
- Query params:
  - `page=1`
  - `limit=20`
  - `search=burger`

Example:

`{{baseUrl}}/api/public/organizations/11111111-1111-1111-1111-111111111111/products?page=1&limit=20&search=burger`

## 4. Get one public product

- Method: `GET`
- URL: `{{baseUrl}}/api/public/products/:productId`

Example:

`{{baseUrl}}/api/public/products/22222222-2222-2222-2222-222222222222`
