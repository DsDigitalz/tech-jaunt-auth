const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

/**
 * Create reusable email transporter using SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER, // generated ethereal user
    pass: process.env.EMAIL_PASS, // app password for Gmail
  },
});

/**
 * Send email helper function with EJS template rendering
 * @param {string} to - Receiver email address
 * @param {string} subject - Email subject
 * @param {string} template - Template name (without .ejs extension)
 * @param {object} data - Data to pass to the template
 */
const sendEmail = async (to, subject, template, data) => {
  try {
    // Resolve template path
    const templatePath = path.join(
      __dirname,
      "../templates",
      `${template}.ejs`,
    );

    // Render HTML from EJS template
    const html = await ejs.renderFile(templatePath, data);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html, // Send as HTML email
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;
