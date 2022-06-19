const express = require('express');
const cors = require("cors");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const authRoute = require("./routes/auth");
const modelRoute = require("./routes/model");

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.json());
app.use(fileUpload({
  createParentPath: true
}));

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "OK"
  });
});

app.use("/auth", authRoute);
app.use("/model", modelRoute);

module.exports = app;
