"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import { uploadImage } from "@/lib/upload";
import { useMe } from "@/components/useMe";
import "../gallery.css";

export default function Maps() {
  const { me } = useMe();
  const admin = !!me && me.role === "admin";
  const [kingdoms, setKingdoms] = useState([]);
  const [maps, setMaps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [title, setTitle] = useState("");
  const [kid, setKid] = useState("");
  const [file, setFile] = useState(null);
  const [fk, setFk] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const c = sb();
    const [k, m] = await Promise.all([
      c.from("kingdoms").select("id, name").order("sort_order"),
      c.from("maps").select("id, title, image_url, kingdom_id").order("sort_order").order("id"),
    ]);
    setKingdoms(k.data || []);
    setMaps(m.data || []);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const kname = (id) => (kingdoms.find((k) => k.id === id) || {}).name;
  const shown = maps.filter((m) =>
    filter === "all" ? true : filter === "main" ? m.kingdom_id == null : String(m.kingdom_id) === filter
  );

  async function add(e) {
    e.preventDefault();
    setMsg("");
    if (!title.trim() || !file) { setMsg("أدخل العنوان واختر صورة."); return; }
    setBusy(true);
    try {
      const url = await uploadImage(file, "maps");
      const { error } = await sb().from("maps").insert({ title: title.trim(), image_url: url, kingdom_id: kid ? Number(kid) : null });
      if (error) throw new Error(error.message);
      setTitle(""); setFile(null); setKid(""); setFk((n) => n + 1);
      await load();
    } catch (err) { setMsg(err.message); }
    setBusy(false);
  }

  async function replace(m, f) {
    if (!f) return;
    try {
      const url = await uploadImage(f, "maps");
      const { error } = await sb().from("maps").update({ image_url: url }).eq("id", m.id);
      if (error) throw new Error(error.message);
      load();
    } catch (err) { setMsg(err.message); }
  }

  async function rename(m) {
    const t = prompt("العنوان الجديد", m.title);
    if (!t || !t.trim()) return;
    await sb().from("maps").update({ title: t.trim() }).eq("id", m.id);
    load();
  }

  async function remove(m) {
    if (!confirm("حذف «" + m.title + "»؟")) return;
    await sb().from("maps").delete().eq("id", m.id);
    load();
  }

  const filters = [["all", "الكل"], ["main", "الخريطة الرئيسية"], ...kingdoms.map((k) => [String(k.id), k.name])];
  const cur = open !== null ? shown[open] : null;

  return (
    <section className="wrap">
      <h2>الخرائط</h2>
      {msg && <div className="msg" role="alert">{msg}</div>}

      {admin && (
        <form className="g-form" onSubmit={add}>
          <strong>إضافة خريطة</strong>
          <label>العنوان
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>المملكة
            <select value={kid} onChange={(e) => setKid(e.target.value)}>
              <option value="">الخريطة الرئيسية</option>
              {kingdoms.map((k) => <option key={k.id} value={String(k.id)}>{k.name}</option>)}
            </select>
          </label>
          <label>الصورة
            <input key={fk} type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <button className="btn" type="submit" disabled={busy}>{busy ? "جارٍ الرفع..." : "إضافة"}</button>
        </form>
      )}

      <div className="g-filters">
        {filters.map(([v, label]) => (
          <button key={v} type="button" className={filter === v ? "on" : ""} onClick={() => { setFilter(v); setOpen(null); }}>{label}</button>
        ))}
      </div>

      {loaded && shown.length === 0 && <p className="empty">لا توجد خرائط هنا بعد.</p>}

      <div className="g-grid">
        {shown.map((m, i) => (
          <figure key={m.id} className="g-card">
            <button type="button" className="g-img" onClick={() => { setOpen(i); setZoom(false); }}>
              <img src={m.image_url} alt={m.title} loading="lazy" />
            </button>
            <figcaption>
              <strong>{m.title}</strong>
              <small>{kname(m.kingdom_id) || "الخريطة الرئيسية"}</small>
              {admin && (
                <div className="g-admin">
                  <button type="button" onClick={() => rename(m)}>العنوان</button>
                  <label className="g-btn">استبدال الصورة
                    <input type="file" accept="image/*" hidden onChange={(e) => replace(m, e.target.files[0])} />
                  </label>
                  <button type="button" onClick={() => remove(m)}>حذف</button>
                </div>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {cur && (
        <div className="lb" role="dialog" aria-modal="true">
          <div className="lb-bar">
            <button type="button" onClick={() => setOpen(null)}>إغلاق</button>
            <button type="button" onClick={() => setZoom((z) => !z)}>{zoom ? "ملاءمة الشاشة" : "الحجم الكامل"}</button>
            {shown.length > 1 && (
              <>
                <button type="button" onClick={() => { setOpen((open + shown.length - 1) % shown.length); setZoom(false); }}>السابقة</button>
                <button type="button" onClick={() => { setOpen((open + 1) % shown.length); setZoom(false); }}>التالية</button>
              </>
            )}
          </div>
          <div className="lb-body">
            <img src={cur.image_url} alt={cur.title} className={zoom ? "full" : "fit"} />
          </div>
          <p className="lb-cap">{cur.title}</p>
        </div>
      )}
    </section>
  );
      }
