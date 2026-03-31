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
const request = require("supertest");

const app = require("../../src/app");
const { getAuthToken } = require("../helpers/authHelper");
const {
  createTestOrganization,
} = require("../helpers/organizationCategoryHelper");
const {
  deleteFile,
  uploadBufferToBucket,
} = require("../../src/modules/storage/storage.service");

function buildStorageUploadResult(bucket, objectPath) {
  const path = `${bucket}/${objectPath}`;

  return {
    bucket,
    path,
    publicUrl: `${STORAGE_PUBLIC_BASE_URL}/${path}`,
  };
}

describe("Upload module", () => {
  beforeEach(() => {
    uploadBufferToBucket.mockReset();
    deleteFile.mockReset();
  });

  it("uploads a product image without requiring a productId", async () => {
    const token = await getAuthToken(app);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    uploadBufferToBucket.mockImplementation(async ({ bucket, objectPath }) =>
      buildStorageUploadResult(bucket, objectPath)
    );

    const response = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("type", "product")
      .attach("file", Buffer.from("product-image"), {
        filename: "main.png",
        contentType: "image/png",
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.bucket).toBe("products");
    expect(response.body.data.path).toMatch(
      new RegExp(`^products/${decoded.organizationId}/[0-9a-f-]+\\.png$`)
    );
    expect(response.body.data.url).toBe(
      `${STORAGE_PUBLIC_BASE_URL}/${response.body.data.path}`
    );
    expect(uploadBufferToBucket).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "products",
        contentType: "image/png",
        objectPath: expect.stringMatching(
          new RegExp(`^${decoded.organizationId}/[0-9a-f-]+\\.png$`)
        ),
      })
    );
  });

  it("ignores forged organization metadata and keeps the JWT organization scope", async () => {
    const token = await getAuthToken(app);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const otherOrganization = await createTestOrganization();

    uploadBufferToBucket.mockImplementation(async ({ bucket, objectPath }) =>
      buildStorageUploadResult(bucket, objectPath)
    );

    const response = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("type", "logo")
      .field("organizationId", otherOrganization.id)
      .attach("file", Buffer.from("logo"), {
        filename: "logo.png",
        contentType: "image/png",
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.path).toMatch(
      new RegExp(`^logos/${decoded.organizationId}/[0-9a-f-]+\\.png$`)
    );
    expect(response.body.data.path.startsWith(`logos/${otherOrganization.id}/`)).toBe(
      false
    );
  });

  it("rejects unsupported file types", async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("type", "cover")
      .attach("file", Buffer.from("not-an-image"), {
        filename: "cover.txt",
        contentType: "text/plain",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Unsupported file type");
  });

  it("deletes a file that belongs to the authenticated organization", async () => {
    const token = await getAuthToken(app);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const storagePath = `couverture/${decoded.organizationId}/cover-abc123.png`;

    deleteFile.mockResolvedValue(undefined);

    const response = await request(app)
      .delete("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "cover",
        path: storagePath,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(deleteFile).toHaveBeenCalledWith(
      `${STORAGE_PUBLIC_BASE_URL}/${storagePath}`
    );
  });

  it("rejects deletion outside the authenticated organization scope", async () => {
    const token = await getAuthToken(app);
    const otherOrganization = await createTestOrganization();

    const response = await request(app)
      .delete("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "cover",
        path: `couverture/${otherOrganization.id}/cover-abc123.png`,
      })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Forbidden");
    expect(deleteFile).not.toHaveBeenCalled();
  });
});
