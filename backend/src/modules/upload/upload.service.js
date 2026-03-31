const { v4: uuidv4 } = require("uuid");

const prisma = require("../../lib/prisma");
const {
  deleteFile,
  parseStorageReference,
  uploadBufferToBucket,
} = require("../storage/storage.service");
const {
  FILE_EXTENSION_BY_MIME,
  deleteUploadSchema,
  uploadImageSchema,
} = require("./upload.validator");

const BUCKET_BY_UPLOAD_TYPE = Object.freeze({
  product: "products",
  logo: "logos",
  cover: "couverture",
});

function createError(message, statusCode = 400, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function validatePayload(schema, payload) {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw createError(
      "Validation failed",
      400,
      error.details.map((detail) => detail.message)
    );
  }

  return value;
}

async function ensureOrganizationAccess(authUser) {
  if (!authUser?.userId || !authUser?.organizationId) {
    throw createError("Unauthorized", 401);
  }

  const organizationId = authUser.organizationId;

  const user = await prisma.user.findFirst({
    where: {
      id: authUser.userId,
      organizationId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw createError("Forbidden", 403);
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!organization) {
    throw createError("Organization not found", 404);
  }

  return organizationId;
}

function buildObjectPath({ organizationId, fileType }) {
  const extension = FILE_EXTENSION_BY_MIME[fileType];

  if (!extension) {
    throw createError("Unsupported file type.", 400);
  }

  return `${organizationId}/${uuidv4()}.${extension}`;
}

function getExpectedPathPrefix(type, organizationId) {
  const bucket = BUCKET_BY_UPLOAD_TYPE[type];

  if (!bucket) {
    throw createError("Unsupported upload type.", 400);
  }

  return `${bucket}/${organizationId}/`;
}

function ensureReferenceBelongsToOrganization(input, organizationId) {
  const reference = input.url || input.path;
  const parsed = parseStorageReference(reference);
  const expectedPrefix = getExpectedPathPrefix(input.type, organizationId);

  if (!parsed.storedPath.startsWith(expectedPrefix)) {
    throw createError("Forbidden", 403);
  }

  return parsed;
}

async function uploadFile(payload, file, authUser) {
  const value = validatePayload(uploadImageSchema, payload);

  if (!file?.buffer) {
    throw createError("Image file is required.", 400);
  }

  const organizationId = await ensureOrganizationAccess(authUser);
  const bucket = BUCKET_BY_UPLOAD_TYPE[value.type];
  const objectPath = buildObjectPath({
    organizationId,
    fileType: file.mimetype,
  });

  const uploadedFile = await uploadBufferToBucket({
    bucket,
    objectPath,
    fileBuffer: file.buffer,
    contentType: file.mimetype,
  });

  return {
    bucket: uploadedFile.bucket,
    path: uploadedFile.path,
    url: uploadedFile.publicUrl,
  };
}

async function deleteUpload(payload, authUser) {
  const value = validatePayload(deleteUploadSchema, payload);
  const organizationId = await ensureOrganizationAccess(authUser);
  const parsed = ensureReferenceBelongsToOrganization(value, organizationId);

  await deleteFile(parsed.publicUrl);

  return {
    path: parsed.storedPath,
    url: parsed.publicUrl,
  };
}

module.exports = {
  uploadFile,
  deleteUpload,
};
