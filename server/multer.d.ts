// multer.d.ts
import { Request } from 'express';
import * as multer from 'multer';


declare global {
  namespace Express {
    interface Request {
      file?: multer.File;  
    }
  }
}