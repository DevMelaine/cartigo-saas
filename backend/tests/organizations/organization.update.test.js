const STORAGE_PUBLIC_BASE_URL =
  "https://example.supabase.co/storage/v1/object/public";

jest.mock("../../src/modules/storage/storage.service", () => {
  const actual = jest.requireActual("../../src/modules/storage/storage.service");

  function toParsedReference(reference) {
    const value = String(reference).trim();

    if (/^https?:\/\//i.test(value)) {
      const prefix = `${STORAGE_PUBLIC_BASE_URL}/`;
      const storedPath = actual.normalizeStoredPath(value.replace(prefix, ""));
      const [bucket, ...objectSegments] = storedPath.split("/");

      return {
        bucket,
        objectPath: objectSegments.join("/"),
        storedPath,
        publicUrl: value,
      };
    }

    const storedPath = actual.normalizeStoredPath(value);
    const [bucket, ...objectSegments] = storedPath.split("/");

    return {
      bucket,
      objectPath: objectSegments.join("/"),
      storedPath,
      publicUrl: `${STORAGE_PUBLIC_BASE_URL}/${storedPath}`,
    };
  }

  return {
    deleteFile: jest.fn(),
    uploadBufferToBucket: jest.fn(),
    normalizeStoredPath: actual.normalizeStoredPath,
    parseStorageReference: jest.fn((reference) => toParsedReference(reference)),
    resolvePublicFileUrl: jest.fn((reference) =>
      reference ? toParsedReference(reference).publicUrl : null
    ),
  };
});

const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const request = require("supertest");
const app = require("../../src/app");
const prisma = require("../../src/lib/prisma");
const {
  createTestOrganization,
} = require("../helpers/organizationCategoryHelper");
const { deleteFile } = require("../../src/modules/storage/storage.service");

async function createOrganizationAdminSession() {
  const organization = await createTestOrganization();
  const user = await prisma.user.create({
    data: {
      email: `admin+${uuidv4()}@example.com`,
      password: "password123",
      name: "Admin",
      role: "ADMIN",
      organizationId: organization.id,
    },
  });

  const token = jwt.sign(
    {
      userId: user.id,
      organizationId: organization.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  return { token, organization, user };
}

describe("PUT /api/organizations/me", () => {
  beforeEach(() => {
    deleteFile.mockReset();
  });

  it("deletes replaced organization logo and cover after a successful update", async () => {
    const session = await createOrganizationAdminSession();
    const decoded = jwt.verify(session.token, process.env.JWT_SECRET);

    await prisma.organization.update({
      where: { id: decoded.organizationId },
      data: {
        logoUrl: `logos/${decoded.organizationId}/logo-old.png`,
        coverImageUrl: `couverture/${decoded.organizationId}/cover-old.png`,
      },
    });

    const response = await request(app)
      .put("/api/organizations/me")
      .set("Authorization", `Bearer ${session.token}`)
      .send({
        logoUrl: `logos/${decoded.organizationId}/logo-new.png`,
        coverImageUrl: `couverture/${decoded.organizationId}/cover-new.png`,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(deleteFile).toHaveBeenCalledTimes(2);
    expect(deleteFile).toHaveBeenCalledWith(
      `logos/${decoded.organizationId}/logo-old.png`
    );
    expect(deleteFile).toHaveBeenCalledWith(
      `couverture/${decoded.organizationId}/cover-old.png`
    );
  });

  it("does not delete anything when the image path stays unchanged", async () => {
    const session = await createOrganizationAdminSession();
    const decoded = jwt.verify(session.token, process.env.JWT_SECRET);
    const logoPath = `logos/${decoded.organizationId}/logo-same.png`;

    await prisma.organization.update({
      where: { id: decoded.organizationId },
      data: {
        logoUrl: logoPath,
      },
    });

    const response = await request(app)
      .put("/api/organizations/me")
      .set("Authorization", `Bearer ${session.token}`)
      .send({
        logoUrl: logoPath,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(deleteFile).not.toHaveBeenCalled();
  });
});
