import { sb } from "./browser";

export async function uploadMedia(bucket, folder, file, contentType) {
  if (file.size > 5 * 1024 * 1024) throw new Error("الملف أكبر من 5 ميغابايت.");
  const type = (contentType || file.type || "application/octet-stream").split(";")[0];
  const raw = type.split("/")[1] || "bin";
  const ext = raw.replace("x-m4a", "m4a").replace("mpeg", "mp3").replace(/[^a-z0-9]/g, "") || "bin";
  const path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
  const c = sb();
  const { error } = await c.storage.from(bucket).upload(path, file, { contentType: type });
  if (error) throw new Error("تعذّر رفع الملف: " + error.message);
  return c.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
