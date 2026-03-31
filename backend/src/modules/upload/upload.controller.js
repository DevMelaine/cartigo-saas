const uploadService = require("./upload.service");

function sendError(res, error, fallbackMessage) {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
    errors: error.details,
  });
}

async function uploadFile(req, res) {
  try {
    const result = await uploadService.uploadFile(req.body, req.file, req.user);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return sendError(res, error, "Unable to upload file.");
  }
}

async function deleteUpload(req, res) {
  try {
    const result = await uploadService.deleteUpload(req.body, req.user);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return sendError(res, error, "Unable to delete file.");
  }
}

module.exports = {
  uploadFile,
  deleteUpload,
};
