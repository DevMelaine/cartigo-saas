const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../../src/app");
const organizationCategoryService = require("../../src/services/organizationCategory.service");

async function createCategory(name, description = null) {
  return prisma.organizationCategory.create({
    data: {
      name,
      description,
    },
  });
}

function signCustomerToken() {
  return jwt.sign(
    {
      customerId: randomUUID(),
      role: "CUSTOMER",
      organizationId: null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );
}

function signUserToken() {
  return jwt.sign(
    {
      userId: randomUUID(),
      organizationId: randomUUID(),
      role: "ADMIN",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );
}

describe("Organization category module", () => {
  beforeEach(() => {
    organizationCategoryService.clearCache();
  });

  afterEach(() => {
    organizationCategoryService.clearCache();
  });

  it("returns the full list of existing organization categories", async () => {
    const token = signUserToken();

    await createCategory("Pharmacie", "Produits de sante");
    await createCategory("Restaurant", "Restauration");
    await createCategory("Boutique", "Commerce de detail");

    const response = await request(app)
      .get("/api/organization-categories")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.map((category) => category.name)).toEqual([
      "Boutique",
      "Pharmacie",
      "Restaurant",
    ]);
  });

  it("returns only categories that exist in the database", async () => {
    const token = signUserToken();

    await createCategory("Supermarche");
    await createCategory("Restaurant");

    const response = await request(app)
      .get("/api/organization-categories")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.data).toEqual([
      expect.objectContaining({ name: "Restaurant" }),
      expect.objectContaining({ name: "Supermarche" }),
    ]);
  });

  it("allows authenticated customers to read organization categories", async () => {
    const customerToken = signCustomerToken();

    await createCategory("Pharmacie");

    const response = await request(app)
      .get("/api/organization-categories")
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("Pharmacie");
  });

  it("rejects unauthenticated access when the endpoint is secured", async () => {
    await createCategory("Boutique");

    const response = await request(app)
      .get("/api/organization-categories")
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
