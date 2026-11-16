"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import { useMe } from "@/components/useMe";
import "./admin.css";

const empty = { id: null, part_id: "", number: "", title: "", content: "", cover_url: "", status: "draft", published_at: null };

export default function Admin() {
  const { me, ready } = useMe();
  const [parts, setParts] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [form, setForm] = useState(empty);
  const [partName, setPartName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const c = sb();
    const [p, ch] = await Promise.all([
      c.from("parts").select("id, title").order("id"),
      c.from("chapters").select("*").order("number"),
    ]);
    setParts(p.data || []);
    setChapters(ch.data || []);
  }, []);

  useEffect(() => {
    if (me && me.role === "admin") load();
  }, [me, load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setMsg("");
    const title = form.title.trim();
    const number = Number(form.number);
    if (!title || !number) { setMsg("أدخل رقم الفصل وعنوانه."); return; }
    setBusy(true);
    const row = {
      part_id: form.part_id ? Number(form.part_id) : null,
      number,
      title,
      content: form.content,
      cover_url: form.cover_url || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    if (form.status === "published" && !form.published_at) row.published_at = new Date().toISOString();
    const c = sb();
    const { error } = form.id
      ? await c.from("chapters").update(row).eq("id", form.id)
      : await c.from("chapters").insert(row);
    if (error) setMsg("تعذّر الحفظ: " + error.message);
    else { setMsg("تم الحفظ."); setForm(empty); await load(); }
    setBusy(false);
  }

  function edit(c) {
    setForm({ ...c, part_id: c.part_id ?? "", cover_url: c.cover_url ?? "" });
    window.scrollTo({ top: 0 });
  }

  async function del(c) {
    if (!confirm("حذف الفصل «" + c.title + "» نهائياً؟")) return;
    const { error } = await sb().from("chapters").delete().eq("id", c.id);
    if (error) setMsg("تعذّر الحذف: " + error.message);
    else load();
  }

  async function addPart() {
    const t = partName.trim();
    if (!t) return;
    const { error } = await sb().from("parts").insert({ title: t });
    if (error) setMsg("تعذّرت الإضافة: " + error.message);
    else { setPartName(""); load(); }
  }

  async function delPart(p) {
    if (!confirm("حذف الجزء «" + p.title + "»؟ ستبقى فصوله دون جزء.")) return;
    await sb().from("parts").delete().eq("id", p.id);
    load();
  }

  async function upload(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setMsg("الصورة أكبر من 5 ميغابايت."); return; }
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = "covers/" + Date.now() + "." + ext;
    const c = sb();
    const { error } = await c.storage.from("images").upload(path, f);
    if (error) { setMsg("تعذّر رفع الصورة: " + error.message); return; }
    const { data } = c.storage.from("images").getPublicUrl(path);
    setForm((x) => ({ ...x, cover_url: data.publicUrl }));
  }

  if (!ready) return <section className="wrap"><p>جارٍ التحميل...</p></section>;
  if (!me || me.role !== "admin") {
    return (
      <section className="wrap">
        <h2>الإدارة</h2>
        <p className="empty">هذه الصفحة للمسؤول فقط.</p>
      </section>
    );
  }

  return (
    <section className="wrap">
      <h2>لوحة الإدارة</h2>
      {msg && <div className="msg" role="alert">{msg}</div>}

      <h3 className="ad-h">{form.id ? "تعديل فصل" : "فصل جديد"}</h3>
      <form className="ad-form" onSubmit={save}>
        <label>الجزء
          <select value={form.part_id} onChange={set("part_id")}>
            <option value="">بدون جزء</option>
            {parts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label>رقم الفصل
          <input type="number" min="1" value={form.number} onChange={set("number")} />
        </label>
        <label>العنوان
          <input value={form.title} onChange={set("title")} />
        </label>
        <label>النص (كل سطر فقرة)
          <textarea rows={14} value={form.content} onChange={set("content")} />
        </label>
        <label>صورة الغلاف
          <input type="file" accept="image/*" onChange={upload} />
        </label>
        {form.cover_url && <img src={form.cover_url} alt="" className="ad-cover" />}
        <label>الحالة
          <select value={form.status} onChange={set("status")}>
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
          </select>
        </label>
        <div className="ad-row">
          <button className="btn" type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ"}</button>
          {form.id && <button type="button" onClick={() => setForm(empty)}>إلغاء التعديل</button>}
        </div>
      </form>

      <h3 className="ad-h">الفصول</h3>
      {chapters.length === 0 && <p className="empty">لا توجد فصول بعد.</p>}
      {chapters.map((c) => (
        <div key={c.id} className="ad-item">
          <span>{c.number}. {c.title} ({c.status === "published" ? "منشور" : "مسودة"})</span>
          <div>
            <button type="button" onClick={() => edit(c)}>تعديل</button>
            <button type="button" onClick={() => del(c)}>حذف</button>
          </div>
        </div>
      ))}

      <h3 className="ad-h">الأجزاء</h3>
      <div className="ad-row">
        <input value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="اسم جزء جديد" aria-label="اسم الجزء" />
        <button className="btn" type="button" onClick={addPart}>إضافة</button>
      </div>
      {parts.map((p) => (
        <div key={p.id} className="ad-item">
          <span>{p.title}</span>
          <button type="button" onClick={() => delPart(p)}>حذف</button>
        </div>
      ))}
    </section>
  );
      }
