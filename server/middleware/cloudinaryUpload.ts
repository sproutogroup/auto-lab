import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../lib/cloudinary";

const vehicleInspectionStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "vehicle-inspections",
    resource_type: "image",
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
  }),
});

export const vehicleInspectionUpload = multer({
  storage: vehicleInspectionStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});
