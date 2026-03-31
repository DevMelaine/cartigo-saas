const jwt = require("jsonwebtoken");

function getOrganizationIdFromToken(token) {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  return decoded.organizationId;
}

async function ensureProductCategory(token, name = "General") {
  const organizationId = getOrganizationIdFromToken(token);

  return global.prisma.category.upsert({
    where: {
      organizationId_name: {
        organizationId,
        name,
      },
    },
    update: {},
    create: {
      organizationId,
      name,
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });
}

module.exports = {
  getOrganizationIdFromToken,
  ensureProductCategory,
};
