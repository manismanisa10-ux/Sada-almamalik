import { sb } from "./browser";

export async function uploadImage(file, folder) {
  if (file.size > 5 * 1024 * 1024) throw new Error("الصورة أكبر من 5 ميغابايت.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = folder + "/" + Date.now() + "." + (ext || "jpg");
  const c = sb();
  const { error } = await c.storage.from("images").upload(path, file);
  if (error) throw new Error("تعذّر رفع الصورة: " + error.message);
  return c.storage.from("images").getPublicUrl(path).data.publicUrl;
}
