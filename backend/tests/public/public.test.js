const request = require("supertest");
const app = require("../../src/app");
const {
  createTestOrganization,
  ensureOrganizationCategory,
} = require("../helpers/organizationCategoryHelper");

describe("Public discovery endpoints", () => {
  it("lists organization categories sorted by name", async () => {
    await ensureOrganizationCategory("Pharmacy");
    await ensureOrganizationCategory("Restaurant");
    await ensureOrganizationCategory("Boutique");

    const response = await request(app).get("/public/categories").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.map((category) => category.name)).toEqual([
      "Boutique",
      "Pharmacy",
      "Restaurant",
    ]);
  });

  it("lists organizations filtered by categoryId using the real relation", async () => {
    const restaurantCategory = await ensureOrganizationCategory("Restaurant");
    const pharmacyCategory = await ensureOrganizationCategory("Pharmacy");

    await createTestOrganization({
      name: "Chez Cartigo",
      categoryName: restaurantCategory.name,
      address: "Downtown",
    });
    await createTestOrganization({
      name: "Green Pharmacy",
      categoryName: pharmacyCategory.name,
      address: "Main Street",
    });

    const response = await request(app)
      .get("/public/organizations")
      .query({ categoryId: restaurantCategory.id, page: 1, limit: 10 })
      .expect(200);

    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.total).toBe(1);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      name: "Chez Cartigo",
      categoryId: restaurantCategory.id,
      category: restaurantCategory.name,
      description: "Downtown",
    });
  });

  it("rejects unknown category filters instead of falling back to heuristics", async () => {
    const response = await request(app)
      .get("/public/organizations")
      .query({ categoryId: "00000000-0000-0000-0000-000000000000" })
      .expect(404);

    expect(response.body.message).toMatch(/organization category not found/i);
  });
});
