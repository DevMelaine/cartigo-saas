const { randomUUID } = require("crypto");
const request = require("supertest");
const app = require("../../src/app");
const organizationCategoryService = require("../../src/services/organizationCategory.service");
const { createOrganizationForTest } = require("../helpers/organizationCategoryHelper");

async function createOrganizationCategory({ name, description = null }) {
  return prisma.organizationCategory.create({
    data: {
      name,
      description,
    },
  });
}

async function createOrganization(overrides = {}) {
  let categoryId = overrides.categoryId;

  if (!categoryId && overrides.categoryName) {
    const category = await createOrganizationCategory({
      name: overrides.categoryName,
    });
    categoryId = category.id;
  }

  return createOrganizationForTest({
    name: overrides.name,
    categoryId,
    logo: overrides.logo,
    isPublic: overrides.isPublic,
    isActive: overrides.isActive,
    address: overrides.address,
  });
}

async function createProduct({
  organizationId,
  name = "Burger Deluxe",
  description = "Freshly prepared burger",
  price = 15,
  quantity = 12,
  isActive = true,
  imageUrl = "https://example.com/product.png",
} = {}) {
  return prisma.product.create({
    data: {
      name,
      description,
      price,
      stock: quantity,
      sku: `SKU-${randomUUID().slice(0, 8).toUpperCase()}`,
      imageUrl,
      isActive,
      organizationId,
      inventory: {
        create: {
          quantity,
          minStock: 2,
          organizationId,
        },
      },
    },
  });
}

async function registerCustomer() {
  const response = await request(app)
    .post("/api/customers/register")
    .send({
      name: "Public Flow Customer",
      email: `public-flow-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: "Password123!",
    })
    .expect(201);

  return response.body.data;
}

describe("Public discovery module", () => {
  beforeEach(() => {
    organizationCategoryService.clearCache();
  });

  afterEach(() => {
    organizationCategoryService.clearCache();
  });

  it("lists predefined organization categories", async () => {
    const restaurant = await createOrganizationCategory({
      name: "Restaurant",
      description: "Restauration",
    });
    const pharmacy = await createOrganizationCategory({
      name: "Pharmacie",
      description: "Sante",
    });

    const response = await request(app).get("/api/public/categories").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([
      {
        id: pharmacy.id,
        name: "Pharmacie",
        description: "Sante",
      },
      {
        id: restaurant.id,
        name: "Restaurant",
        description: "Restauration",
      },
    ]);
  });

  it("lists active organizations filtered by categoryId with pagination", async () => {
    const restaurantCategory = await createOrganizationCategory({ name: "Restaurant" });
    const supermarketCategory = await createOrganizationCategory({ name: "Supermarche" });

    await createOrganization({
      name: "Restaurant A",
      categoryId: restaurantCategory.id,
    });
    await createOrganization({
      name: "Restaurant B",
      categoryId: restaurantCategory.id,
    });
    await createOrganization({
      name: "Restaurant Inactive",
      categoryId: restaurantCategory.id,
      isActive: false,
    });
    await createOrganization({
      name: "Supermarket A",
      categoryId: supermarketCategory.id,
    });

    const response = await request(app)
      .get(`/api/public/organizations?categoryId=${restaurantCategory.id}&page=1&limit=1`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        category: "Restaurant",
      })
    );
  });

  it("lists only active products for the selected active organization", async () => {
    const category = await createOrganizationCategory({ name: "Restaurant" });
    const organization = await createOrganization({
      name: "Burger House",
      categoryId: category.id,
    });
    const otherOrganization = await createOrganization({
      name: "Other Shop",
      categoryId: category.id,
    });

    await createProduct({
      organizationId: organization.id,
      name: "Burger Deluxe",
      description: "Loaded burger",
      quantity: 12,
    });
    await createProduct({
      organizationId: organization.id,
      name: "Hidden Burger",
      description: "Should stay hidden",
      quantity: 99,
      isActive: false,
    });
    await createProduct({
      organizationId: otherOrganization.id,
      name: "Other Burger",
      description: "Other organization",
      quantity: 25,
    });

    const response = await request(app)
      .get(`/api/public/organizations/${organization.id}/products?search=deluxe`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.data).toEqual([
      {
        id: expect.any(String),
        name: "Burger Deluxe",
        price: 15,
        image: "https://example.com/product.png",
        quantity: 12,
      },
    ]);
  });

  it("returns 404 when browsing products from an inactive organization", async () => {
    const category = await createOrganizationCategory({ name: "Restaurant" });
    const inactiveOrganization = await createOrganization({
      name: "Inactive Store",
      categoryId: category.id,
      isActive: false,
    });

    await createProduct({
      organizationId: inactiveOrganization.id,
      name: "Private Meal",
    });

    const response = await request(app)
      .get(`/api/public/organizations/${inactiveOrganization.id}/products`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Organization not found");
  });

  it("returns product details with inventory quantity for active organizations", async () => {
    const category = await createOrganizationCategory({ name: "Restaurant" });
    const organization = await createOrganization({
      name: "Detail Store",
      categoryId: category.id,
    });
    const product = await createProduct({
      organizationId: organization.id,
      name: "Pizza Royale",
      description: "Wood-fired pizza",
      price: 22,
      quantity: 7,
      imageUrl: "https://example.com/pizza.png",
    });

    const response = await request(app)
      .get(`/api/public/products/${product.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      id: product.id,
      name: "Pizza Royale",
      description: "Wood-fired pizza",
      price: 22,
      image: "https://example.com/pizza.png",
      quantity: 7,
    });
  });

  it("hides products that belong to inactive organizations or are themselves inactive", async () => {
    const category = await createOrganizationCategory({ name: "Pharmacie" });
    const inactiveOrganization = await createOrganization({
      name: "Inactive Detail Store",
      categoryId: category.id,
      isActive: false,
    });
    const activeOrganization = await createOrganization({
      name: "Active Detail Store",
      categoryId: category.id,
    });

    const inactiveOrgProduct = await createProduct({
      organizationId: inactiveOrganization.id,
      name: "Inactive Org Product",
    });
    const inactiveProduct = await createProduct({
      organizationId: activeOrganization.id,
      name: "Inactive Product",
      isActive: false,
    });

    await request(app).get(`/api/public/products/${inactiveOrgProduct.id}`).expect(404);
    await request(app).get(`/api/public/products/${inactiveProduct.id}`).expect(404);
  });

  it("supports the customer browsing flow through discovery to cart", async () => {
    const category = await createOrganizationCategory({ name: "Boutique" });
    const organization = await createOrganization({
      name: "Customer Flow Store",
      categoryId: category.id,
    });
    const product = await createProduct({
      organizationId: organization.id,
      name: "Flow Product",
      description: "Flow description",
      price: 99,
      quantity: 14,
    });
    const customerSession = await registerCustomer();

    const categoriesResponse = await request(app)
      .get("/api/public/categories")
      .expect(200);
    expect(categoriesResponse.body.data.some((item) => item.id === category.id)).toBe(true);

    const organizationsResponse = await request(app)
      .get(`/api/public/organizations?categoryId=${category.id}`)
      .expect(200);
    expect(organizationsResponse.body.data.some((item) => item.id === organization.id)).toBe(true);

    const productsResponse = await request(app)
      .get(`/api/public/organizations/${organization.id}/products`)
      .expect(200);
    expect(productsResponse.body.data.some((item) => item.id === product.id)).toBe(true);

    const productDetailsResponse = await request(app)
      .get(`/api/public/products/${product.id}`)
      .expect(200);
    expect(productDetailsResponse.body.data.id).toBe(product.id);

    const cartResponse = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerSession.accessToken}`)
      .send({
        productId: product.id,
        quantity: 2,
      })
      .expect(200);

    expect(cartResponse.body.success).toBe(true);
    expect(cartResponse.body.data.quantity).toBe(2);
  });

  it("rejects invalid identifiers and invalid category filters", async () => {
    const invalidCategoryResponse = await request(app)
      .get("/api/public/organizations?categoryId=not-a-uuid")
      .expect(400);

    expect(invalidCategoryResponse.body.success).toBe(false);
    expect(invalidCategoryResponse.body.message).toBe("Validation failed");

    const invalidProductResponse = await request(app)
      .get("/api/public/products/not-a-uuid")
      .expect(400);

    expect(invalidProductResponse.body.success).toBe(false);
    expect(invalidProductResponse.body.message).toBe("Validation failed");

    const invalidOrganizationResponse = await request(app)
      .get("/api/public/organizations/not-a-uuid/products")
      .expect(400);

    expect(invalidOrganizationResponse.body.success).toBe(false);
    expect(invalidOrganizationResponse.body.message).toBe("Validation failed");
  });
});
