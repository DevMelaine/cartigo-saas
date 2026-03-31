const { createClient } = require("@supabase/supabase-js");

const STORAGE_BUCKET_CONFIG_BY_NAME = Object.freeze({
  products: Object.freeze({
    public: true,
    fileSizeLimit: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  }),
  logos: Object.freeze({
    public: true,
    fileSizeLimit: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  }),
  couverture: Object.freeze({
    public: true,
    fileSizeLimit: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  }),
});
const SUPPORTED_BUCKETS = Object.freeze(Object.keys(STORAGE_BUCKET_CONFIG_BY_NAME));
const DEFAULT_CACHE_CONTROL = "3600";
const PUBLIC_STORAGE_PATH_SEGMENT = "/storage/v1/object/public/";

let supabaseAdminClient = null;
let storageBucketsReady = false;
let storageBucketSyncPromise = null;

function createStorageError(message, statusCode = 500, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function getSupabaseUrl() {
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    throw createStorageError("Storage service is not configured.", 500);
  }

  return supabaseUrl;
}

function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw createStorageError("Storage service is not configured.", 500);
  }

  supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}

function assertSupportedBucket(bucket) {
  if (!SUPPORTED_BUCKETS.includes(bucket)) {
    throw createStorageError("Invalid storage bucket.", 400);
  }
}

function cloneBucketConfig(bucket) {
  const config = STORAGE_BUCKET_CONFIG_BY_NAME[bucket];

  return {
    public: config.public,
    fileSizeLimit: config.fileSizeLimit,
    allowedMimeTypes: [...config.allowedMimeTypes],
  };
}

function areStringArraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function hasBucketConfigDrift(existingBucket, expectedConfig) {
  const existingFileSizeLimit =
    existingBucket.fileSizeLimit ?? existingBucket.file_size_limit ?? null;
  const existingAllowedMimeTypes =
    existingBucket.allowedMimeTypes ?? existingBucket.allowed_mime_types ?? [];

  return (
    Boolean(existingBucket.public) !== expectedConfig.public ||
    existingFileSizeLimit !== expectedConfig.fileSizeLimit ||
    !areStringArraysEqual(existingAllowedMimeTypes, expectedConfig.allowedMimeTypes)
  );
}

function handleBucketSyncError(action, bucket, error) {
  if (!error) {
    return;
  }

  throw createStorageError(`Unable to ${action} storage bucket "${bucket}".`, 502);
}

function ensureRequiredStorageBuckets() {
  if (storageBucketsReady) {
    return Promise.resolve();
  }

  if (!storageBucketSyncPromise) {
    storageBucketSyncPromise = (async () => {
      const client = getSupabaseAdminClient();
      const { data: existingBuckets, error } = await client.storage.listBuckets();

      handleSupabaseStorageError("list storage buckets", error);

      const bucketsById = new Map(
        (existingBuckets || []).map((bucket) => [bucket.id || bucket.name, bucket])
      );

      for (const bucket of SUPPORTED_BUCKETS) {
        const existingBucket = bucketsById.get(bucket);
        const expectedConfig = cloneBucketConfig(bucket);

        if (!existingBucket) {
          const { error: createError } = await client.storage.createBucket(
            bucket,
            expectedConfig
          );

          handleBucketSyncError("create", bucket, createError);
          continue;
        }

        if (!hasBucketConfigDrift(existingBucket, expectedConfig)) {
          continue;
        }

        const { error: updateError } = await client.storage.updateBucket(
          bucket,
          expectedConfig
        );

        handleBucketSyncError("update", bucket, updateError);
      }

      storageBucketsReady = true;
    })().catch((error) => {
      storageBucketSyncPromise = null;
      throw error;
    });
  }

  return storageBucketSyncPromise;
}

function normalizeStoredPath(path) {
  if (typeof path !== "string") {
    throw createStorageError("Invalid file path.", 400);
  }

  const normalizedPath = path.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");

  if (
    !normalizedPath ||
    normalizedPath.startsWith("/") ||
    normalizedPath.endsWith("/") ||
    normalizedPath.includes("..")
  ) {
    throw createStorageError("Invalid file path.", 400);
  }

  return normalizedPath;
}

function parseStoredPath(path) {
  const normalizedPath = normalizeStoredPath(path);
  const [bucket, ...objectSegments] = normalizedPath.split("/");

  assertSupportedBucket(bucket);

  if (objectSegments.length === 0) {
    throw createStorageError("Invalid file path.", 400);
  }

  const objectPath = objectSegments.join("/");

  if (!objectPath) {
    throw createStorageError("Invalid file path.", 400);
  }

  return {
    bucket,
    objectPath,
    storedPath: normalizedPath,
  };
}

function buildPublicFileUrl(reference) {
  const { bucket, objectPath } = parseStoredPath(reference);
  const client = getSupabaseAdminClient();
  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);

  if (!data?.publicUrl) {
    throw createStorageError("Unable to generate public URL.", 500);
  }

  return data.publicUrl;
}

function parsePublicFileUrl(reference) {
  if (typeof reference !== "string" || reference.trim().length === 0) {
    throw createStorageError("Invalid file URL.", 400);
  }

  let url;

  try {
    url = new URL(reference.trim());
  } catch {
    throw createStorageError("Invalid file URL.", 400);
  }

  const supabaseOrigin = new URL(getSupabaseUrl()).origin;

  if (url.origin !== supabaseOrigin) {
    throw createStorageError("Invalid file URL.", 400);
  }

  if (!url.pathname.startsWith(PUBLIC_STORAGE_PATH_SEGMENT)) {
    throw createStorageError("Invalid file URL.", 400);
  }

  const encodedStoragePath = url.pathname.slice(PUBLIC_STORAGE_PATH_SEGMENT.length);
  const decodedStoragePath = encodedStoragePath
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");

  const parsed = parseStoredPath(decodedStoragePath);

  return {
    ...parsed,
    publicUrl: buildPublicFileUrl(parsed.storedPath),
  };
}

function parseStorageReference(reference) {
  if (typeof reference !== "string") {
    throw createStorageError("Invalid file reference.", 400);
  }

  const trimmedReference = reference.trim();

  if (!trimmedReference) {
    throw createStorageError("Invalid file reference.", 400);
  }

  if (/^https?:\/\//i.test(trimmedReference)) {
    return parsePublicFileUrl(trimmedReference);
  }

  const parsed = parseStoredPath(trimmedReference);

  return {
    ...parsed,
    publicUrl: buildPublicFileUrl(parsed.storedPath),
  };
}

function resolvePublicFileUrl(reference) {
  if (reference === null || reference === undefined) {
    return null;
  }

  try {
    return parseStorageReference(reference).publicUrl;
  } catch {
    return null;
  }
}

function handleSupabaseStorageError(action, error) {
  if (!error) {
    return;
  }

  throw createStorageError(`Unable to ${action}.`, 502);
}

async function uploadBufferToBucket({
  bucket,
  objectPath,
  fileBuffer,
  contentType,
  cacheControl = DEFAULT_CACHE_CONTROL,
  upsert = false,
}) {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw createStorageError("Invalid file buffer.", 400);
  }

  if (typeof contentType !== "string" || contentType.trim().length === 0) {
    throw createStorageError("Invalid file content type.", 400);
  }

  const parsed = parseStoredPath(`${bucket}/${objectPath}`);
  const client = getSupabaseAdminClient();

  await ensureRequiredStorageBuckets();

  const { error } = await client.storage.from(parsed.bucket).upload(parsed.objectPath, fileBuffer, {
    cacheControl,
    contentType,
    upsert,
  });

  handleSupabaseStorageError("upload file", error);

  return {
    bucket: parsed.bucket,
    path: parsed.storedPath,
    publicUrl: buildPublicFileUrl(parsed.storedPath),
  };
}

async function deleteFile(reference) {
  const client = getSupabaseAdminClient();
  const { bucket, objectPath } = parseStorageReference(reference);
  const { error } = await client.storage.from(bucket).remove([objectPath]);

  handleSupabaseStorageError("delete file", error);
}

module.exports = {
  SUPPORTED_BUCKETS,
  DEFAULT_CACHE_CONTROL,
  createStorageError,
  normalizeStoredPath,
  parseStoredPath,
  parseStorageReference,
  buildPublicFileUrl,
  resolvePublicFileUrl,
  ensureRequiredStorageBuckets,
  uploadBufferToBucket,
  deleteFile,
};
