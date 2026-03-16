const { PrismaClient } = require("@prisma/client");

const prisma = global.prisma || new PrismaClient();

const organizationCategorySelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

class OrganizationCategoryService {
  constructor({ prismaClient = prisma, cacheTtlMs = 5 * 60 * 1000 } = {}) {
    this.prisma = prismaClient;
    this.cacheTtlMs = cacheTtlMs;
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  isCacheValid() {
    return Array.isArray(this.cache) && Date.now() < this.cacheExpiresAt;
  }

  setCache(categories) {
    this.cache = categories;
    this.cacheExpiresAt = Date.now() + this.cacheTtlMs;
  }

  clearCache() {
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Returns the static organization category list.
   * This stays read-only for application actors, so a short in-memory cache
   * avoids repeated identical queries under load.
   */
  async listCategories() {
    if (this.isCacheValid()) {
      return this.cache;
    }

    const categories = await this.prisma.organizationCategory.findMany({
      select: organizationCategorySelect,
      orderBy: {
        name: "asc",
      },
    });

    this.setCache(categories);
    return categories;
  }
}

const organizationCategoryService = new OrganizationCategoryService();

module.exports = organizationCategoryService;
module.exports.OrganizationCategoryService = OrganizationCategoryService;
