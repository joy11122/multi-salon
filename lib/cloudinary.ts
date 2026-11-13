import { createHash } from "node:crypto";

export function createCloudinaryUploadSignature(timestamp: number, folder: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured.");
  const allowedFormats = "avif,jpg,png,webp";
  const params = "allowed_formats=" + allowedFormats + "&folder=" + folder + "&timestamp=" + timestamp;
  const signature = createHash("sha1").update(params + apiSecret).digest("hex");
  return { cloudName, apiKey, timestamp, folder, allowedFormats, signature };
}
