const nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");

const transport = nodemailer.createTransport(
  MailtrapTransport({
    token: process.env.MAILTRAP_TOKEN,
  })
);

async function sendTrainingInviteEmail({ to, fullName, moduleTitle, inviteLink }) {
  const emailTo = String(to || "").trim();
  if (!emailTo) throw new Error("Missing recipient email (to).");

  return transport.sendMail({
    from: '"Training Portal" <hello@demomailtrap.co>',
    to: emailTo,
    subject: "Training Module Access",
    text:
      `Hi ${fullName},\n\n` +
      `You have been granted access to the module: ${moduleTitle}\n\n` +
      `Access your account here:\n${inviteLink}\n\n`,
  });
}

module.exports = { sendTrainingInviteEmail };
