"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sb } from "@/lib/browser";
import { uploadMedia } from "@/lib/media";
import { useMe } from "./useMe";
import Avatar from "./Avatar";
import Media from "./Media";
import "../app/feed.css";

const prof = (n) => "/profile?u=" + encodeURIComponent(n);
const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

function when(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "الآن";
  if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
  if (s < 604800) return rtf.format(-Math.floor(s / 86400), "day");
  return new Date(d).toLocaleDateString("ar", { day: "numeric", month: "long" });
}

export default function Feed({ userId }) {
  const { me, ready } = useMe();
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [names, setNames] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState({});
  const [drafts, setDrafts] = useState({});
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const imgRef = useRef(null);
  const vidRef = useRef(null);

  const load = useCallback(async () => {
    const c = sb();
    let q = c
      .from("posts")
      .select("id, user_id, body, kind, media_url, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (userId) q = q.eq("user_id", userId);
    const { data, error } = await q;
    if (error) { setErr("تعذّر تحميل المنشورات: " + error.message); setLoaded(true); return; }
    const list = data || [];
    setPosts(list);
    let cm = [];
    if (list.length) {
      const r = await c
        .from("post_comments")
        .select("id, post_id, user_id, body, created_at")
        .in("post_id", list.map((p) => p.id))
        .order("created_at");
      cm = r.data || [];
    }
    const by = {};
    cm.forEach((x) => { (by[x.post_id] = by[x.post_id] || []).push(x); });
    setComments(by);
    const ids = [...new Set([...list.map((p) => p.user_id), ...cm.map((x) => x.user_id)])];
    if (ids.length) {
      const p = await c.from("profiles").select("id, nickname").in("id", ids);
      const m = {};
      (p.data || []).forEach((r) => { m[r.id] = r.nickname; });
      setNames((n) => ({ ...n, ...m }));
    }
    setLoaded(true);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  function pick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) setFile(f);
  }

  async function publish(e) {
    e.preventDefault();
    setErr("");
    const text = body.trim();
    if (!text && !file) return;
    setBusy(true);
    try {
      let kind = "text";
      let url = null;
      if (file) {
        const isVid = file.type.startsWith("video/");
        if (!isVid && !file.type.startsWith("image/")) throw new Error("اختر صورة أو فيديو.");
        url = await uploadMedia("chat", me.id, file, undefined, isVid ? 25 : 5);
        kind = isVid ? "video" : "image";
      }
      const { error } = await sb().from("posts").insert({ user_id: me.id, body: text, kind, media_url: url });
      if (error) throw new Error(/rate/i.test(error.message) ? "انتظر قليلاً قبل نشر منشور آخر." : "تعذّر النشر: " + error.message);
      setBody("");
      setFile(null);
      await load();
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  async function removePost(id) {
    if (!confirm("حذف هذا المنشور؟")) return;
    await sb().from("posts").delete().eq("id", id);
    load();
  }

  async function addComment(e, postId) {
    e.preventDefault();
    const text = (drafts[postId] || "").trim();
    if (!text) return;
    setErr("");
    const { error } = await sb().from("post_comments").insert({ post_id: postId, user_id: me.id, body: text });
    if (error) { setErr(/rate/i.test(error.message) ? "انتظر لحظات قبل التعليق مرة أخرى." : "تعذّر التعليق: " + error.message); return; }
    setDrafts((d) => ({ ...d, [postId]: "" }));
    load();
  }

  async function removeComment(id) {
    if (!confirm("حذف هذا التعليق؟")) return;
    await sb().from("post_comments").delete().eq("id", id);
    load();
  }

  const showComposer = !!me && (!userId || me.id === userId);

  return (
    <div className="feed-box">
      {ready && !me && (
        <p className="msg">للنشر والتعليق <Link href="/auth">سجّل الدخول أو أنشئ حساباً</Link>.</p>
      )}

      {showComposer && (
        <form className="composer" onSubmit={publish}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="شارك شيئاً مع الجميع..." aria-label="منشور جديد" />
          {file && (
            <div className="composer-file">
              <span>{file.name}</span>
              <button type="button" onClick={() => setFile(null)}>إزالة</button>
            </div>
          )}
          <div className="composer-bar">
            <button type="button" disabled={busy} onClick={() => imgRef.current && imgRef.current.click()}>🖼️ صورة</button>
            <button type="button" disabled={busy} onClick={() => vidRef.current && vidRef.current.click()}>🎬 فيديو</button>
            <input type="file" accept="image/*" hidden ref={imgRef} onChange={pick} />
            <input type="file" accept="video/*" hidden ref={vidRef} onChange={pick} />
            <button type="submit" className="post-send" disabled={busy}>{busy ? "جارٍ النشر..." : "نشر"}</button>
          </div>
        </form>
      )}

      {err && <div className="msg" role="alert">{err}</div>}
      {loaded && posts.length === 0 && !err && <p className="empty">لا توجد منشورات بعد.</p>}

      {posts.map((p) => {
        const nick = names[p.user_id] || "عضو";
        const cs = comments[p.id] || [];
        return (
          <article key={p.id} className="post">
            <header className="post-head">
              <Link href={prof(nick)} className="post-who">
                <Avatar name={nick} size={40} />
                <span>{nick}</span>
              </Link>
              <small>{when(p.created_at)}</small>
              {me && (me.id === p.user_id || me.role === "admin") && (
                <button type="button" className="post-del" onClick={() => removePost(p.id)}>حذف</button>
              )}
            </header>
            {p.body && <p className="post-body">{p.body}</p>}
            {p.media_url && <Media m={p} />}
            <button type="button" className="post-cbtn" onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}>
              💬 التعليقات ({cs.length})
            </button>
            {open[p.id] && (
              <div className="post-comments">
                {cs.map((x) => {
                  const cn = names[x.user_id] || "عضو";
                  return (
                    <div key={x.id} className="pc">
                      <Link href={prof(cn)}><Avatar name={cn} size={28} /></Link>
                      <div className="pc-main">
                        <Link href={prof(cn)} className="pc-name">{cn}</Link>
                        <span>{x.body}</span>
                        <small>
                          {when(x.created_at)}
                          {me && (me.id === x.user_id || me.role === "admin") && (
                            <button type="button" onClick={() => removeComment(x.id)}>حذف</button>
                          )}
                        </small>
                      </div>
                    </div>
                  );
                })}
                {me && (
                  <form className="pc-form" onSubmit={(e) => addComment(e, p.id)}>
                    <input value={drafts[p.id] || ""} onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))} maxLength={1000} placeholder="اكتب تعليقاً" aria-label="تعليق" />
                    <button type="submit">إرسال</button>
                  </form>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
                           }
