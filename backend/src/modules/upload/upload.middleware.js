const multer = require("multer");
const {
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_IMAGE_TYPES,
} = require("./upload.validator");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.mimetype)) {
      callback(new Error("Unsupported file type. Use PNG, JPG, or WEBP."));
      return;
    }

    callback(null, true);
  },
});

function applySingleImageUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          success: false,
          message: "File is too large. Maximum size is 3MB.",
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error.message || "Invalid upload request.",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Unable to process uploaded file.",
    });
  });
}

module.exports = {
  applySingleImageUpload,
};
