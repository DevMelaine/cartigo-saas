const invitationService = require("../services/invitation.service");

async function createInvitation(req, res) {
  try {
    const invitation = await invitationService.createInvitation(req.body, req.user);
    return res.status(201).json({ success: true, data: invitation });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message,
      errors: err.details,
    });
  }
}

async function listInvitations(req, res) {
  try {
    const invitations = await invitationService.listInvitations(req.user);
    return res.status(200).json({ success: true, data: invitations });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message,
    });
  }
}

async function acceptInvitation(req, res) {
  try {
    const result = await invitationService.acceptInvitation(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message,
      errors: err.details,
    });
  }
}

module.exports = {
  createInvitation,
  listInvitations,
  acceptInvitation,
};
