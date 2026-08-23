import nodemailer from "nodemailer";

const port = Number(
  process.env.ETHEREAL_PORT || 587
);

const transporter =
  nodemailer.createTransport({
    host:
      process.env.ETHEREAL_HOST ||
      "smtp.ethereal.email",

    port,

    secure: port === 465,

    auth: {
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASSWORD,
    },
  });

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(
  input: SendEmailInput
) {
  if (
    !process.env.ETHEREAL_USER ||
    !process.env.ETHEREAL_PASSWORD
  ) {
    throw new Error(
      "Ethereal credentials are not configured"
    );
  }

  const info = await transporter.sendMail({
    from:
      process.env.ETHEREAL_FROM ||
      process.env.ETHEREAL_USER,

    to: input.to,

    subject: input.subject,

    text: input.body,
  });

  return {
    messageId: info.messageId,
    previewUrl:
      nodemailer.getTestMessageUrl(info) || null,
  };
}