const express = require("express");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/send-verification-code", (req, res) => {
  const { email, code } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Verification Code",
    text: `Your verification code is: ${code}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: "Error sending email", error });
    } else {
      return res.status(200).json({ message: "Verification code sent" });
    }
  });
});

router.post("/feedback", (req, res) => {
  const { feedback } = req.body;

  const feedbackMailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: "Feedback",
    text: feedback,
  };

  transporter.sendMail(feedbackMailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: "Error sending email", error });
    } else {
      return res.status(200).json({ message: "Feedback sent successfully" });
    }
  });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate JWT with expiration time (e.g., 1 hour)
    const token = jwt.sign({ email: user.email }, jwtSecret, {
      expiresIn: "1h",
    });

    const resetLink = `http://../auth/reset-password/${token}`; // Replace with your app's URL

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      text: `You have requested a password reset. Please click on the link below or copy and paste it into your browser to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: "Error sending email", error });
      } else {
        res
          .status(200)
          .json({ message: "Password reset link sent to your email" });
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
