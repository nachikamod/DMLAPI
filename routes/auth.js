const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

router.post(
  "/register",
  body("username")
    .not()
    .isEmpty()
    .isLength({ min: 5, max: 15 })
    .trim()
    .escape(),
  body("password")
    .not()
    .isEmpty()
    .isLength({ min: 5, max: 18 })
    .trim()
    .escape(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    const exists = await prisma.user.findUnique({
      where: {
        username: username,
      },
      select: {
        username: true,
      },
    });

    if (exists) {
      return res.status(400).json({
        error: "User already exists",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    if (hash) {
      await prisma.user.create({
        data: {
          username: username,
          password: hash,
        },
      });

      return res.status(200).json({
        message: "User created",
      });
    }

    return res.status(500).json({
      error: "Error hashing the password",
    });
  }
);

router.post(
  "/login",
  body("username")
    .not()
    .isEmpty()
    .isLength({ min: 5, max: 15 })
    .trim()
    .escape(),
  body("password")
    .not()
    .isEmpty()
    .isLength({ min: 5, max: 18 })
    .trim()
    .escape(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    const exists = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    if (exists) {
      const validatePassword = await bcrypt.compare(password, exists.password);

      if (validatePassword) {
        const token = jwt.sign(exists.username, process.env.TOKEN_SECRET);

        return res.status(200).json({
          token: token,
        });
      }
    }

    return res.status(400).json({
      error: "Invalid Username or Password",
    });
  }
);

module.exports = router;
