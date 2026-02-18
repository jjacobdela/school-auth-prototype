const nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");

const transport = nodemailer.createTransport(
  MailtrapTransport({
    token: process.env.MAILTRAP_TOKEN,
  })
);

async function sendTrainingInviteEmail({
  to,
  fullName,
  moduleTitle,
  inviteLink,
  tempPassword
}) {
  return transport.sendMail({
    from: '"Training Portal" <hello@demomailtrap.co>',
    to,
    subject: "Your Training Account",
    text:
      `Hi ${fullName},\n\n` +
      `You now have access to: ${moduleTitle}\n\n` +
      (tempPassword
        ? `Your temporary login credentials:\nEmail: ${to}\nPassword: ${tempPassword}\n\n`
        : `Use your existing account to login.\n\n`) +
      `Login here:\n${inviteLink}\n\n` +
      `Please change your password after logging in.\n`,
  });

}

module.exports = { sendTrainingInviteEmail };
