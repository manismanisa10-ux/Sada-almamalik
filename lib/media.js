import { sb } from "./browser";

const MB = 1024 * 1024;

export async function uploadMedia(bucket, folder, file, contentType, maxMb = 5) {
  if (file.size > maxMb * MB) throw new Error("الملف أكبر من " + maxMb + " ميغابايت.");
  const type = (contentType || file.type || "application/octet-stream").split(";")[0];
  const raw = type.split("/")[1] || "bin";
  const ext = raw.replace("x-m4a", "m4a").replace("mpeg", "mp3").replace("quicktime", "mov").replace(/[^a-z0-9]/g, "") || "bin";
  const path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
  const c = sb();
  const { error } = await c.storage.from(bucket).upload(path, file, { contentType: type });
  if (error) throw new Error("تعذّر رفع الملف: " + error.message);
  return c.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
