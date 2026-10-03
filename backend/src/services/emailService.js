const nodemailer = require("nodemailer");
const { logger, maskEmail } = require("../lib/logger");

let transporter;

function getRequiredEmailConfig() {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM,
  } = process.env;

  if (
    !EMAIL_HOST ||
    !EMAIL_PORT ||
    !EMAIL_USER ||
    !EMAIL_PASS ||
    !EMAIL_FROM
  ) {
    const error = new Error("Email service environment variables are not configured.");
    error.statusCode = 500;
    throw error;
  }

  return {
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    user: EMAIL_USER,
    pass: EMAIL_PASS,
    from: EMAIL_FROM,
  };
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (process.env.NODE_ENV === "test") {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });

    return transporter;
  }

  const config = getRequiredEmailConfig();

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

function getFromAddress() {
  if (process.env.NODE_ENV === "test") {
    return process.env.EMAIL_FROM || "no-reply@cartigo.test";
  }

  return getRequiredEmailConfig().from;
}

async function sendEmailMessage({ to, subject, text, html, template = "generic" }) {
  const currentTransporter = getTransporter();

  const from = getFromAddress();

  try {
    const info = await currentTransporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    logger.info("Email sent.", {
      template,
      to: maskEmail(to),
      from: maskEmail(from),
      messageId: info?.messageId,
      response: info?.response,
    });

    return info;
  } catch (error) {
    logger.error("Email send failed.", {
      template,
      to: maskEmail(to),
      from: maskEmail(from),
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

async function sendPasswordResetEmail({ to, resetUrl, name }) {
  return sendEmailMessage({
    template: "password_reset",
    to,
    subject: "Reinitialisation de votre mot de passe Cartigo",
    text: [
      `Bonjour ${name || "utilisateur"},`,
      "",
      "Vous avez demande la reinitialisation de votre mot de passe.",
      `Utilisez ce lien dans l'heure: ${resetUrl}`,
      "",
      "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
    ].join("\n"),
    html: `
      <p>Bonjour ${name || "utilisateur"},</p>
      <p>Vous avez demande la reinitialisation de votre mot de passe.</p>
      <p>
        <a href="${resetUrl}">Reinitialiser mon mot de passe</a>
      </p>
      <p>Ce lien expire dans une heure.</p>
      <p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
    `,
  });
}

async function sendInvitationEmail({ to, inviteUrl, role, expiresAt, organizationName, performedByName }) {
  const expiryText = expiresAt
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(expiresAt))
    : "bientot";

  const orgLine = organizationName ? `Organisation: ${organizationName}.` : null;
  const byLine = performedByName ? `Invite par: ${performedByName}.` : null;

  return sendEmailMessage({
    template: "invitation",
    to,
    subject: organizationName
      ? `Invitation a rejoindre ${organizationName}`
      : "Invitation a rejoindre Cartigo",
    text: [
      "Bonjour,",
      "",
      `Vous avez ete invite a rejoindre une organisation Cartigo avec le role ${role}.`,
      orgLine,
      byLine,
      `Lien d'activation: ${inviteUrl}`,
      `Ce lien expire le ${expiryText}.`,
      "",
      "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
    ].filter(Boolean).join("\n"),
    html: `
      <p>Bonjour,</p>
      <p>Vous avez ete invite a rejoindre ${
        organizationName ? `<strong>${organizationName}</strong>` : "une organisation Cartigo"
      } avec le role <strong>${role}</strong>.</p>
      ${organizationName ? `<p><strong>Organisation :</strong> ${organizationName}</p>` : ""}
      ${performedByName ? `<p><strong>Invite par :</strong> ${performedByName}</p>` : ""}
      <p>
        <a href="${inviteUrl}">Accepter l'invitation</a>
      </p>
      <p>Ce lien expire le ${expiryText}.</p>
      <p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
    `,
  });
}

async function sendUserUpdatedEmail({ to, name, role, organizationName, performedByName }) {
  const orgLine = organizationName ? `Organisation: ${organizationName}.` : null;
  const byLine = performedByName ? `Action par: ${performedByName}.` : null;

  return sendEmailMessage({
    template: "user_updated",
    to,
    subject: "Vos informations ont ete mises a jour",
    text: [
      `Bonjour ${name || "utilisateur"},`,
      "",
      "Votre profil a ete mis a jour par un administrateur.",
      role ? `Votre role actuel: ${role}.` : null,
      orgLine,
      byLine,
      "",
      "Si vous n'etes pas a l'origine de cette modification, contactez le support.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <p>Bonjour ${name || "utilisateur"},</p>
      <p>Votre profil a ete mis a jour par un administrateur.</p>
      ${role ? `<p><strong>Role actuel :</strong> ${role}</p>` : ""}
      ${organizationName ? `<p><strong>Organisation :</strong> ${organizationName}</p>` : ""}
      ${performedByName ? `<p><strong>Action par :</strong> ${performedByName}</p>` : ""}
      <p>Si vous n'etes pas a l'origine de cette modification, contactez le support.</p>
    `,
  });
}

async function sendUserDeactivatedEmail({ to, name, organizationName, performedByName }) {
  const orgLine = organizationName ? `Organisation: ${organizationName}.` : null;
  const byLine = performedByName ? `Action par: ${performedByName}.` : null;

  return sendEmailMessage({
    template: "user_deactivated",
    to,
    subject: "Votre acces Cartigo a ete desactive",
    text: [
      `Bonjour ${name || "utilisateur"},`,
      "",
      "Votre acces a Cartigo a ete desactive par un administrateur.",
      orgLine,
      byLine,
      "Si vous pensez qu'il s'agit d'une erreur, contactez votre organisation.",
    ].join("\n"),
    html: `
      <p>Bonjour ${name || "utilisateur"},</p>
      <p>Votre acces a Cartigo a ete desactive par un administrateur.</p>
      ${organizationName ? `<p><strong>Organisation :</strong> ${organizationName}</p>` : ""}
      ${performedByName ? `<p><strong>Action par :</strong> ${performedByName}</p>` : ""}
      <p>Si vous pensez qu'il s'agit d'une erreur, contactez votre organisation.</p>
    `,
  });
}

async function sendUserReactivatedEmail({ to, name, organizationName, performedByName }) {
  const orgLine = organizationName ? `Organisation: ${organizationName}.` : null;
  const byLine = performedByName ? `Action par: ${performedByName}.` : null;

  return sendEmailMessage({
    template: "user_reactivated",
    to,
    subject: "Votre acces Cartigo a ete reactive",
    text: [
      `Bonjour ${name || "utilisateur"},`,
      "",
      "Votre acces a Cartigo a ete reactive par un administrateur.",
      orgLine,
      byLine,
      "Vous pouvez vous reconnecter des maintenant.",
    ].join("\n"),
    html: `
      <p>Bonjour ${name || "utilisateur"},</p>
      <p>Votre acces a Cartigo a ete reactive par un administrateur.</p>
      ${organizationName ? `<p><strong>Organisation :</strong> ${organizationName}</p>` : ""}
      ${performedByName ? `<p><strong>Action par :</strong> ${performedByName}</p>` : ""}
      <p>Vous pouvez vous reconnecter des maintenant.</p>
    `,
  });
}

async function sendUserDeletedEmail({ to, name, organizationName, performedByName }) {
  const orgLine = organizationName ? `Organisation: ${organizationName}.` : null;
  const byLine = performedByName ? `Action par: ${performedByName}.` : null;

  return sendEmailMessage({
    template: "user_deleted",
    to,
    subject: "Votre compte Cartigo a ete supprime",
    text: [
      `Bonjour ${name || "utilisateur"},`,
      "",
      "Votre compte Cartigo a ete supprime par un administrateur.",
      orgLine,
      byLine,
      "Si vous pensez qu'il s'agit d'une erreur, contactez votre organisation.",
    ].join("\n"),
    html: `
      <p>Bonjour ${name || "utilisateur"},</p>
      <p>Votre compte Cartigo a ete supprime par un administrateur.</p>
      ${organizationName ? `<p><strong>Organisation :</strong> ${organizationName}</p>` : ""}
      ${performedByName ? `<p><strong>Action par :</strong> ${performedByName}</p>` : ""}
      <p>Si vous pensez qu'il s'agit d'une erreur, contactez votre organisation.</p>
    `,
  });
}

module.exports = {
  sendEmailMessage,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendUserUpdatedEmail,
  sendUserDeactivatedEmail,
  sendUserReactivatedEmail,
  sendUserDeletedEmail,
};
