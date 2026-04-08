import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    callback(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowed.includes(file.mimetype)) {
      callback(new Error("Only PDF and DOCX files are supported."));
      return;
    }

    callback(null, true);
  }
});
