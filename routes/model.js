const authGuard = require("../middleware/auth.guard");
const router = require("express").Router();
var fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { exec } = require("child_process");
const { body, param, validationResult } = require("express-validator");

const prisma = new PrismaClient();

router.post("/create", authGuard, async (req, res) => {
  const { name, entryFile, inputFolder, outputFolder } = req.body;

  const parentDIR = fs.existsSync(__dirname + "\\" + name);

  if (!parentDIR) {
    fs.mkdirSync(__dirname + "\\" + name);
  }

  const inputDIR = fs.existsSync(__dirname + "\\" + name + "\\" + inputFolder);
  const outputDIR = fs.existsSync(
    __dirname + "\\" + name + "\\" + outputFolder
  );

  if (!inputDIR && inputFolder) {
    fs.mkdirSync(__dirname + "\\" + name + "\\" + inputFolder);
  }

  if (!outputDIR && outputFolder) {
    fs.mkdirSync(__dirname + "\\" + name + "\\" + outputFolder);
  }

  for (var i = 0; i < req.files.modelFiles.length; i++) {
    const modelFile = req.files.modelFiles[i];
    modelFile.mv(__dirname + "\\" + name + "\\" + modelFile.name);
  }

  exec(
    `pip install -r "${__dirname}\\${name}\\requirements.txt"`,
    async (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return res.status(400).json({
          error: error,
        });
      }

      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return res.status(400).json({
          error: stderr,
        });
      }

      const model = await prisma.model.create({
        data: {
          name: name,
          entry_point: entryFile,
          file_input: inputFolder,
          file_output: outputFolder,
        },
      });

      return res.status(200).json({
        terminal: stdout,
        model: model,
      });
    }
  );
});

router.get("/get", authGuard, async (req, res) => {
  const models = await prisma.model.findMany();

  return res.status(200).json({
    models: models,
  });
});

router.get(
  "/form/:id",
  authGuard,
  param("id").not().isEmpty().isInt().toInt(),
  async (req, res) => {
    const model = await prisma.model.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        formStructure: true,
      },
    });

    if (model) {
      return res.status(200).json({
        formStructure: model.formStructure,
      });
    }

    return res.status(400).json({
      error: "Not found",
    });
  }
);

router.post("/delete", authGuard, async (req, res) => {
  const model = await prisma.model.delete({
    where: {
      id: req.body.id,
    },
  });

  fs.rmSync(__dirname + "\\" + model.name, {
    recursive: true,
    force: true,
  });

  return res.status(200).json({
    model: model,
  });
});

router.post(
  "/form",
  authGuard,
  body("id").not().isEmpty().isInt().toInt(),
  body("formStructure").not().isEmpty().isString(),
  async (req, res) => {
    const model = await prisma.model.update({
      where: {
        id: req.body.id,
      },
      data: {
        formStructure: req.body.formStructure,
      },
    });

    if (model) {
      return res.status(200).json({
        message: "OK",
      });
    }

    return res.status(400).json({
      error: "Unhandled error",
    });
  }
);

router.post("/execute/:id", authGuard, param("id").not().isEmpty().isInt().toInt(), async (req, res) => {
  const model = await prisma.model.findUnique({
    where: {
      id: req.params.id,
    }
  });

  if (model) {

    if (model.file_input && req.files) {

      const dirContents = fs.readdirSync(__dirname + "\\" + model.name + "\\" + model.file_input);

      if (dirContents.length > 0) {

        for (var file of dirContents) {

          fs.unlinkSync(__dirname + "\\" + model.name + "\\" + model.file_input + "\\" + file);

        }

      }

    }
    else {
      return res.status(400).json({
        error: "No files supplied",
      });
    }

    if (model.file_output) {
      const dirContents = fs.readdirSync(__dirname + "\\" + model.name + "\\" + model.file_output);


      if (dirContents.length > 0) {

        for (var file of dirContents) {

          fs.unlinkSync(__dirname + "\\" + model.name + "\\" + model.file_output + "\\" + file);

        }

      }

    }

    for (let key of Object.keys(req.files)) {
      const ext = req.files[key].name.split(".").filter(Boolean).slice(1).join(".");
      req.files[key].mv(__dirname + "\\" + model.name + "\\" + model.file_input + "\\" + key + "." + ext);
    }


    var arguments = "";

    if (req.body.arguments) {
      const argARR = req.body.arguments.replace("[", "").replace("]", "").split(",");

      for (let arg of argARR) {
        if (/\s/g.test(arg)) {
          arguments += ' "' + arg + '"'
        }
        else {
          arguments += ' ' + arg
        }
      }

    }

    exec(`python "${__dirname}\\${model.name}\\${model.entry_point}" "${__dirname}\\${model.name}"${arguments}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return res.status(400).json({
          error: error,
        });
      }

      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return res.status(200).json({
          error: stderr,
        });
      }

      if (model.file_output) {

        const dirContents = fs.readdirSync(__dirname + "\\" + model.name + "\\" + model.file_output);

        return res.status(200).json({
          output: stdout,
          files: dirContents
        });

      }

      return res.status(200).json({
        output: stdout,
      });
    });

  }
  else {
    return res.status(400).json({
      error: "Not found",
    });
  }

});

router.post("/file", authGuard, body("id").not().isEmpty().isInt().toInt(), async (req, res) => {
  const model = await prisma.model.findUnique({
    where: {
      id: req.body.id
    }
  });

  if (model) {
    return res.status(200).sendFile(`${__dirname}\\${model.name}\\${model.file_output}\\${req.body['file-name']}`);
  }
  else {

    return res.status(400).json({
      error: "Not found"
    });

  }

});

module.exports = router;
