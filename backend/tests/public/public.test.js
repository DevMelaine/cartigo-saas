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

    const categoryNames = response.body.map((category) => category.name);

    expect(Array.isArray(response.body)).toBe(true);
    expect(categoryNames).toEqual([...categoryNames].sort());
    expect(categoryNames).toEqual(
      expect.arrayContaining(["Boutique", "Pharmacy", "Restaurant"])
    );
  });

  it("lists organizations filtered by categoryId using the real relation", async () => {
    const restaurantCategory = await ensureOrganizationCategory("Restaurant");
    const pharmacyCategory = await ensureOrganizationCategory("Pharmacy");

    await global.prisma.organization.create({
      data: {
        name: "Chez Cartigo",
        categoryId: restaurantCategory.id,
        address: "Downtown",
        description: "Cuisine locale et rapide",
      },
    });
    await global.prisma.organization.create({
      data: {
        name: "Green Pharmacy",
        categoryId: pharmacyCategory.id,
        address: "Main Street",
      },
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
      description: "Cuisine locale et rapide",
    });
  });

  it("rejects unknown category filters instead of falling back to heuristics", async () => {
    const response = await request(app)
      .get("/public/organizations")
      .query({ categoryId: "00000000-0000-0000-0000-000000000000" })
      .expect(404);

    expect(response.body.message).toMatch(/organization category not found/i);
  });

  it("returns organization details with real profile fields and grouped product categories", async () => {
    const organizationCategory = await ensureOrganizationCategory("Restaurant");
    const organization = await createTestOrganization({
      name: "Maison Cartigo",
      categoryName: organizationCategory.name,
      address: "Rue de Lome",
      description: "La reference pour les plats maison",
      logoUrl: "https://cdn.cartigo.test/logo.png",
      coverImageUrl: "https://cdn.cartigo.test/cover.png",
      openingHours: {
        timezone: "Africa/Lome",
        schedule: [
          { day: "MONDAY", opensAt: "08:00", closesAt: "22:00", isClosed: false },
          { day: "TUESDAY", opensAt: "08:00", closesAt: "22:00", isClosed: false },
        ],
      },
    });

    await global.prisma.category.create({
      data: {
        name: "Pizzas",
        organizationId: organization.id,
      },
    });

    const pizzasCategory = await global.prisma.category.findFirstOrThrow({
      where: {
        organizationId: organization.id,
        name: "Pizzas",
      },
    });

    const drinkCategory = await global.prisma.category.create({
      data: {
        name: "Boissons",
        organizationId: organization.id,
      },
    });

    const margherita = await global.prisma.product.create({
      data: {
        name: "Pizza Margherita",
        price: 4500,
        sku: "PIZZA-001",
        organizationId: organization.id,
        categoryId: pizzasCategory.id,
      },
    });

    await global.prisma.inventory.create({
      data: {
        organizationId: organization.id,
        productId: margherita.id,
        quantity: 12,
      },
    });

    const soda = await global.prisma.product.create({
      data: {
        name: "Soda maison",
        description: "Boisson fraiche",
        price: 1500,
        sku: "DRINK-001",
        organizationId: organization.id,
        categoryId: drinkCategory.id,
      },
    });

    await global.prisma.inventory.create({
      data: {
        organizationId: organization.id,
        productId: soda.id,
        quantity: 7,
      },
    });

    const response = await request(app)
      .get(`/public/organizations/${organization.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: organization.id,
      name: "Maison Cartigo",
      address: "Rue de Lome",
      description: "La reference pour les plats maison",
      logo: "https://cdn.cartigo.test/logo.png",
      coverImage: "https://cdn.cartigo.test/cover.png",
      categoryId: organizationCategory.id,
      category: organizationCategory.name,
    });

    expect(response.body.categories).toEqual([
      expect.objectContaining({
        id: drinkCategory.id,
        name: "Boissons",
        productCount: 1,
      }),
      expect.objectContaining({
        id: pizzasCategory.id,
        name: "Pizzas",
        productCount: 1,
      }),
    ]);

    expect(response.body.products).toEqual([
      expect.objectContaining({
        name: "Soda maison",
        categoryId: drinkCategory.id,
        categoryName: "Boissons",
        quantity: 7,
      }),
      expect.objectContaining({
        name: "Pizza Margherita",
        categoryId: pizzasCategory.id,
        categoryName: "Pizzas",
        quantity: 12,
      }),
    ]);
  });
});
