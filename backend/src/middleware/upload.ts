import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { ENV } from '../config/env';
import { FileSanitizer } from '../utils/fileSanitizer';

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const runId = req.params.runId;
    let targetDir = ENV.UPLOAD_DIR;

    if (runId) {
      targetDir = path.join(ENV.RUN_DIR, runId, 'input');
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const safeName = FileSanitizer.sanitizeFileName(file.originalname);
    // Use unique timestamp prefix to prevent accidental collision
    const timestamp = Date.now();
    cb(null, `${timestamp}_${safeName}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (FileSanitizer.isAllowedExtension(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file extension. Allowed extensions: .xlsx, .xls, .csv, .txt, .zip`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ENV.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  },
});
