const categoryService = require("../services/category.service");

async function create(req, res) {
  try {
    const category = await categoryService.createCategory(req.body, req.user.organizationId);
    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, details: err.details });
  }
}

async function list(req, res) {
  try {
    const result = await categoryService.listCategories(req.user.organizationId, req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, details: err.details });
  }
}

async function getById(req, res) {
  try {
    const category = await categoryService.getCategoryById(req.params.id, req.user.organizationId);
    return res.status(200).json({ success: true, data: category });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

async function update(req, res) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body, req.user.organizationId);
    return res.status(200).json({ success: true, data: category });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, details: err.details });
  }
}

async function deleteCategory(req, res) {
  try {
    const result = await categoryService.deleteCategory(req.params.id, req.user.organizationId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  deleteCategory,
};
