const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.TOKEN_SECRET);
    next();
  }
  catch(error) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }
};
