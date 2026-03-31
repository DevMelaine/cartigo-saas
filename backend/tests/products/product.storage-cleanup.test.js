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

function buildProductPath(organizationId, filename) {
  return `products/${organizationId}/${filename}`;
}

function buildProductUrl(organizationId, filename) {
  return `${STORAGE_PUBLIC_BASE_URL}/${buildProductPath(organizationId, filename)}`;
}

async function createProductAdminSession() {
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

describe("Product storage cleanup", () => {
  beforeEach(() => {
    deleteFile.mockReset();
  });

  it("deletes the previous main image and only removed gallery images", async () => {
    const session = await createProductAdminSession();
    const decoded = jwt.verify(session.token, process.env.JWT_SECRET);

    const product = await prisma.product.create({
      data: {
        name: "Storage product",
        price: 20,
        stock: 10,
        sku: "STORAGE-001",
        organizationId: decoded.organizationId,
        imageUrl: buildProductPath(decoded.organizationId, "main-old.png"),
        galleryImages: [
          buildProductPath(decoded.organizationId, "gallery-1.png"),
          buildProductUrl(decoded.organizationId, "gallery-2.png"),
        ],
      },
    });

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({
        imageUrl: buildProductUrl(decoded.organizationId, "main-new.png"),
        galleryImages: [
          buildProductPath(decoded.organizationId, "gallery-2.png"),
          buildProductUrl(decoded.organizationId, "gallery-3.png"),
        ],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(deleteFile).toHaveBeenCalledTimes(2);
    expect(deleteFile).toHaveBeenCalledWith(
      buildProductPath(decoded.organizationId, "main-old.png")
    );
    expect(deleteFile).toHaveBeenCalledWith(
      buildProductPath(decoded.organizationId, "gallery-1.png")
    );
  });

  it("does not delete the main image when the reference stays the same", async () => {
    const session = await createProductAdminSession();
    const decoded = jwt.verify(session.token, process.env.JWT_SECRET);
    const stableImagePath = buildProductPath(decoded.organizationId, "main-same.png");

    const product = await prisma.product.create({
      data: {
        name: "Stable product",
        price: 10,
        stock: 5,
        sku: "STABLE-001",
        organizationId: decoded.organizationId,
        imageUrl: stableImagePath,
      },
    });

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({
        imageUrl: buildProductUrl(decoded.organizationId, "main-same.png"),
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it("does not delete a removed image when another product still references it", async () => {
    const session = await createProductAdminSession();
    const decoded = jwt.verify(session.token, process.env.JWT_SECRET);
    const sharedImagePath = buildProductPath(decoded.organizationId, "shared-main.png");

    const product = await prisma.product.create({
      data: {
        name: "Primary product",
        price: 30,
        stock: 9,
        sku: "PRIMARY-001",
        organizationId: decoded.organizationId,
        imageUrl: sharedImagePath,
      },
    });

    await prisma.product.create({
      data: {
        name: "Secondary product",
        price: 35,
        stock: 4,
        sku: "SECONDARY-001",
        organizationId: decoded.organizationId,
        galleryImages: [buildProductUrl(decoded.organizationId, "shared-main.png")],
      },
    });

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({
        imageUrl: buildProductPath(decoded.organizationId, "replacement.png"),
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(deleteFile).not.toHaveBeenCalled();
  });
});
