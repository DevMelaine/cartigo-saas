const inventoryService = require("../services/inventory.service");

async function addStock(req, res) {
  try {
    const inventory = await inventoryService.addStock(req.body, req.user.organizationId);
    return res.status(200).json({ success: true, data: inventory, message: "Stock added successfully" });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, details: err.details });
  }
}

async function removeStock(req, res) {
  try {
    const inventory = await inventoryService.removeStock(req.body, req.user.organizationId);
    return res.status(200).json({ success: true, data: inventory, message: "Stock removed successfully" });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, details: err.details });
  }
}

async function getByProductId(req, res) {
  try {
    const inventory = await inventoryService.getInventoryByProductId(
      req.params.productId,
      req.user.organizationId
    );
    return res.status(200).json({ success: true, data: inventory });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

async function update(req, res) {
  try {
    const inventory = await inventoryService.updateInventory(
      req.params.productId,
      req.body,
      req.user.organizationId
    );
    return res.status(200).json({ success: true, data: inventory });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, details: err.details });
  }
}

module.exports = {
  addStock,
  removeStock,
  getByProductId,
  update,
};
