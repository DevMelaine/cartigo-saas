const Joi = require("joi");

const UPLOAD_TYPES = Object.freeze([
  "product",
  "logo",
  "cover",
]);

const SUPPORTED_IMAGE_TYPES = Object.freeze([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const FILE_EXTENSION_BY_MIME = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
});

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

const uploadImageSchema = Joi.object({
  type: Joi.string()
    .valid(...UPLOAD_TYPES)
    .required(),
});

const deleteUploadSchema = Joi.object({
  type: Joi.string()
    .valid(...UPLOAD_TYPES)
    .required(),
  path: Joi.string().trim().min(10).max(1024),
  url: Joi.string().uri().max(2048),
}).xor("path", "url");

module.exports = {
  UPLOAD_TYPES,
  SUPPORTED_IMAGE_TYPES,
  FILE_EXTENSION_BY_MIME,
  MAX_FILE_SIZE_BYTES,
  uploadImageSchema,
  deleteUploadSchema,
};
