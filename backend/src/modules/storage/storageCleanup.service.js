const { deleteFile, parseStorageReference } = require("./storage.service");

function normalizePaths(paths) {
  if (!Array.isArray(paths)) {
    return [];
  }

  return Array.from(
    new Set(
      paths
        .filter((path) => typeof path === "string" && path.trim().length > 0)
        .map((path) => path.trim())
    )
  );
}

function isPathAllowed(path, allowedPrefixes) {
  return allowedPrefixes.some((prefix) => path.startsWith(prefix));
}

async function cleanupRemovedFiles(
  paths,
  { allowedPrefixes = [], shouldDelete, context = "storage-cleanup" } = {}
) {
  const normalizedPaths = normalizePaths(paths);

  if (normalizedPaths.length === 0) {
    return;
  }

  const deletionTasks = normalizedPaths.map(async (path) => {
    let normalizedPath;

    try {
      normalizedPath = parseStorageReference(path).storedPath;
    } catch {
      console.warn(`STORAGE_PATH_SUSPICIOUS context=${context} path=${path}`);
      return;
    }

    if (!isPathAllowed(normalizedPath, allowedPrefixes)) {
      console.warn(`STORAGE_PATH_FORBIDDEN context=${context} path=${normalizedPath}`);
      return;
    }

    if (typeof shouldDelete === "function") {
      try {
        const canDelete = await shouldDelete(normalizedPath);

        if (!canDelete) {
          console.info(`STORAGE_FILE_SKIPPED context=${context} path=${normalizedPath}`);
          return;
        }
      } catch (error) {
        console.error(
          `STORAGE_FILE_CHECK_FAILED context=${context} path=${normalizedPath} message=${error.message}`
        );
        return;
      }
    }

    try {
      await deleteFile(normalizedPath);
      console.info(`STORAGE_FILE_DELETED context=${context} path=${normalizedPath}`);
    } catch (error) {
      console.error(
        `STORAGE_FILE_DELETE_FAILED context=${context} path=${normalizedPath} message=${error.message}`
      );
    }
  });

  await Promise.allSettled(deletionTasks);
}

module.exports = {
  cleanupRemovedFiles,
};
