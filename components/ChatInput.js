"use client";
import { useRef, useState } from "react";
import { uploadMedia } from "@/lib/media";
import "../app/chat.css";

const STICKERS = ["👑", "🏰", "⚔️", "🗡️", "🛡️", "🐉", "🔥", "❄️", "🌙", "⭐", "🦅", "🐺", "🦁", "🕊️", "💀", "🩸", "📜", "🔮", "🍷", "❤️", "😂", "😢", "😡", "😮", "👏", "🙏", "💪", "🎉"];

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export default function ChatInput({ userId, onSend }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const mr = useRef(null);
  const chunks = useRef([]);
  const tick = useRef(null);
  const limit = useRef(null);
  const stream = useRef(null);
  const fileRef = useRef(null);
    const videoRef = useRef(null);

  async function send(msg) {
    setErr("");
    const e = await onSend(msg);
    if (e) setErr(e);
    return !e;
  }

  async function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    if (await send({ kind: "text", body: t, media_url: null })) setText("");
  }

  async function sticker(s) {
    setOpen(false);
    await send({ kind: "sticker", body: s, media_url: null });
  }

  async function image(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("اختر ملف صورة."); return; }
    setBusy(true);
    try {
      const url = await uploadMedia("chat", userId, f);
      await send({ kind: "image", body: "", media_url: url });
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  async function video(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("video/")) { setErr("اختر ملف فيديو."); return; }
    if (f.size > 25 * 1024 * 1024) { setErr("الفيديو أكبر من 25 ميغابايت. اختر مقطعاً أقصر."); return; }
    setBusy(true);
    try {
      const url = await uploadMedia("chat", userId, f, undefined, 25);
      await send({ kind: "video", body: "", media_url: url });
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  function cleanup() {
    clearInterval(tick.current);
    clearTimeout(limit.current);
    if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
    setRec(false);
  }

  function finish(sendIt) {
    const r = mr.current;
    if (!r) return;
    r.onstop = async () => {
      cleanup();
      if (!sendIt) return;
      const type = (r.mimeType || "audio/webm").split(";")[0];
      const blob = new Blob(chunks.current, { type });
      if (blob.size < 1000) return;
      setBusy(true);
      try {
        const url = await uploadMedia("chat", userId, blob, type);
        await send({ kind: "voice", body: "", media_url: url });
      } catch (x) { setErr(x.message); }
      setBusy(false);
    };
    if (r.state !== "inactive") r.stop();
  }

  async function start() {
    setErr("");
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices) { setErr("المتصفح لا يدعم تسجيل الصوت."); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
      chunks.current = [];
      r.ondataavailable = (ev) => { if (ev.data.size) chunks.current.push(ev.data); };
      r.start();
      mr.current = r;
      setRec(true);
      setSecs(0);
      tick.current = setInterval(() => setSecs((n) => n + 1), 1000);
      limit.current = setTimeout(() => finish(true), 60000);
    } catch {
      setErr("تعذّر الوصول إلى الميكروفون. اسمح به من إعدادات المتصفح.");
    }
  }

  return (
    <div>
      {err && <div className="msg" role="alert">{err}</div>}
      {open && (
        <div className="stk-grid">
          {STICKERS.map((s) => (
            <button key={s} type="button" onClick={() => sticker(s)}>{s}</button>
          ))}
        </div>
      )}
      {rec ? (
        <div className="chat-form">
          <span className="rec-dot">● جارٍ التسجيل {secs} ث</span>
          <button type="button" onClick={() => finish(false)}>إلغاء</button>
          <button type="button" onClick={() => finish(true)}>إرسال</button>
        </div>
      ) : (
        <form className="chat-form" onSubmit={submit}>
          <button type="button" aria-label="ملصقات" onClick={() => setOpen((o) => !o)}>😊</button>
          <button type="button" aria-label="إرسال صورة" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>🖼️</button>
          <input type="file" accept="image/*" hidden ref={fileRef} onChange={image} />
                  <button type="button" aria-label="إرسال فيديو" disabled={busy} onClick={() => videoRef.current && videoRef.current.click()}>🎬</button>
          <input type="file" accept="video/*" hidden ref={videoRef} onChange={video} />
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="اكتب رسالتك" aria-label="رسالتك" />
          {text.trim() ? (
            <button type="submit" disabled={busy}>إرسال</button>
          ) : (
            <button type="button" aria-label="تسجيل رسالة صوتية" disabled={busy} onClick={start}>🎤</button>
          )}
        </form>
      )}
    </div>
  );
                                             }
