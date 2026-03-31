const nodemailer = require("nodemailer");

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

async function sendPasswordResetEmail({ to, resetUrl, name }) {
  const currentTransporter = getTransporter();

  return currentTransporter.sendMail({
    from: getFromAddress(),
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

module.exports = {
  sendPasswordResetEmail,
};
