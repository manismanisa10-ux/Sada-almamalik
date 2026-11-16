"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import { uploadImage } from "@/lib/upload";
import { uploadMedia } from "@/lib/media";
import { useMe } from "@/components/useMe";
import "../gallery.css";

const empty = { id: null, name: "", description: "", kingdom_id: "", image_url: "", audio_url: "" };

export default function Characters() {
  const { me } = useMe();
  const admin = !!me && me.role === "admin";
  const [kingdoms, setKingdoms] = useState([]);
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [f, setF] = useState(empty);
  const [file, setFile] = useState(null);
  const [audio, setAudio] = useState(null);
  const [fk, setFk] = useState(0);
  const [open, setOpen] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const c = sb();
    const [k, p] = await Promise.all([
      c.from("kingdoms").select("id, name").order("sort_order"),
      c.from("characters").select("id, name, description, image_url, audio_url, kingdom_id").order("sort_order").order("id"),
    ]);
    setKingdoms(k.data || []);
    setList(p.data || []);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => setF((x) => ({ ...x, [key]: e.target.value }));
  const reset = () => { setF(empty); setFile(null); setAudio(null); setFk((n) => n + 1); };

  async function save(e) {
    e.preventDefault();
    setMsg("");
    const name = f.name.trim();
    if (!name) { setMsg("أدخل اسم الشخصية."); return; }
    setBusy(true);
    try {
      let img = f.image_url || null;
      if (file) img = await uploadImage(file, "characters");
      let aud = f.audio_url || null;
      if (audio) {
        if (!audio.type.startsWith("audio/")) throw new Error("اختر ملفاً صوتياً.");
        aud = await uploadMedia("images", "voices", audio);
      }
      const row = {
        name,
        description: f.description.trim() || null,
        kingdom_id: f.kingdom_id ? Number(f.kingdom_id) : null,
        image_url: img,
        audio_url: aud,
      };
      const c = sb();
      const { error } = f.id
        ? await c.from("characters").update(row).eq("id", f.id)
        : await c.from("characters").insert(row);
      if (error) throw new Error(error.message);
      reset();
      await load();
    } catch (err) { setMsg(err.message); }
    setBusy(false);
  }

  function edit(c) {
    setF({
      id: c.id,
      name: c.name,
      description: c.description || "",
      kingdom_id: c.kingdom_id == null ? "" : String(c.kingdom_id),
      image_url: c.image_url || "",
      audio_url: c.audio_url || "",
    });
    setFile(null);
    setAudio(null);
    window.scrollTo({ top: 0 });
  }

  async function remove(c) {
    if (!confirm("حذف «" + c.name + "»؟")) return;
    await sb().from("characters").delete().eq("id", c.id);
    load();
  }

  const groups = [
    ...kingdoms.map((k) => ({ id: k.id, name: k.name, items: list.filter((c) => c.kingdom_id === k.id) })),
    { id: "x", name: "شخصيات أخرى", items: list.filter((c) => !kingdoms.some((k) => k.id === c.kingdom_id)) },
  ].filter((g) => g.items.length > 0);

  return (
    <section className="wrap">
      <h2>الشخصيات</h2>
      {msg && <div className="msg" role="alert">{msg}</div>}

      {admin && (
        <form className="g-form" onSubmit={save}>
          <strong>{f.id ? "تعديل شخصية" : "إضافة شخصية"}</strong>
          <label>الاسم
            <input value={f.name} onChange={set("name")} />
          </label>
          <label>المملكة
            <select value={f.kingdom_id} onChange={set("kingdom_id")}>
              <option value="">بدون مملكة</option>
              {kingdoms.map((k) => <option key={k.id} value={String(k.id)}>{k.name}</option>)}
            </select>
          </label>
          <label>وصف مختصر
            <textarea rows={3} value={f.description} onChange={set("description")} />
          </label>
          <label>الصورة {f.id && "(اتركها فارغة للإبقاء على الحالية)"}
            <input key={"i" + fk} type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <label>مقطع صوتي (حتى 5 ميغابايت)
            <input key={"a" + fk} type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files[0] || null)} />
          </label>
          {f.audio_url && !audio && (
            <div>
              <audio src={f.audio_url} controls preload="none" className="char-audio" />
              <button type="button" className="g-btn" onClick={() => setF((x) => ({ ...x, audio_url: "" }))}>إزالة الصوت</button>
            </div>
          )}
          <div className="g-admin">
            <button className="btn" type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ"}</button>
            {f.id && <button type="button" onClick={reset}>إلغاء التعديل</button>}
          </div>
        </form>
      )}

      {loaded && list.length === 0 && <p className="empty">لم تُضف شخصيات بعد.</p>}

      {groups.map((g) => (
        <div key={g.id}>
          <h3 className="g-kh">{g.name}</h3>
          <div className="g-grid">
            {g.items.map((c) => (
              <figure key={c.id} className="g-card tall">
                {c.image_url && (
                  <button type="button" className="g-img" onClick={() => { setOpen(c); setZoom(false); }}>
                    <img src={c.image_url} alt={c.name} loading="lazy" />
                  </button>
                )}
                <figcaption>
                  <strong>{c.name}</strong>
                  {c.description && <p>{c.description}</p>}
                  {c.audio_url && <audio src={c.audio_url} controls preload="none" className="char-audio" />}
                  {admin && (
                    <div className="g-admin">
                      <button type="button" onClick={() => edit(c)}>تعديل</button>
                      <button type="button" onClick={() => remove(c)}>حذف</button>
                    </div>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}

      {open && (
        <div className="lb" role="dialog" aria-modal="true">
          <div className="lb-bar">
            <button type="button" onClick={() => setOpen(null)}>إغلاق</button>
            <button type="button" onClick={() => setZoom((z) => !z)}>{zoom ? "ملاءمة الشاشة" : "الحجم الكامل"}</button>
          </div>
          <div className="lb-body">
            <img src={open.image_url} alt={open.name} className={zoom ? "full" : "fit"} />
          </div>
          <p className="lb-cap"><strong>{open.name}</strong>{open.description ? " — " + open.description : ""}</p>
          {open.audio_url && <audio src={open.audio_url} controls className="char-audio" style={{ maxWidth: "24rem", margin: "0 auto 1rem" }} />}
        </div>
      )}
    </section>
  );
        }
