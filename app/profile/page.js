"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/browser";
import FriendButton from "@/components/FriendButton";
import Feed from "@/components/Feed";
import Avatar from "@/components/Avatar";
import "../social.css";
import "../feed.css";

const fmt = (d) => new Date(d).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });

function Inner() {
  const sp = useSearchParams();
  const nick = (sp.get("u") || "").trim().slice(0, 24);
  const [state, setState] = useState("loading");
  const [p, setP] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setState("loading");
    if (!nick) { setState("missing"); return; }
    (async () => {
      const c = sb();
      const r = await c.from("profiles").select("id, nickname, created_at").eq("nickname", nick).maybeSingle();
      if (r.error) { setState("error"); return; }
      if (!r.data) { setState("missing"); return; }
      setP(r.data);
      const cm = await c
        .from("comments")
        .select("id, body, created_at, chapter_id")
        .eq("user_id", r.data.id)
        .order("created_at", { ascending: false })
        .limit(30);
      const list = cm.data || [];
      const ch = {};
      if (list.length) {
        const x = await c.from("chapters").select("id, title, number").in("id", [...new Set(list.map((y) => y.chapter_id))]);
        (x.data || []).forEach((z) => { ch[z.id] = z; });
      }
      setRows(list.map((y) => ({ ...y, chapter: ch[y.chapter_id] })));
      setState("ok");
    })();
  }, [nick]);

  if (state === "loading") return <section className="wrap"><p className="empty">جارٍ التحميل...</p></section>;
  if (state !== "ok") {
    return (
      <section className="wrap">
        <h2>الصفحة الشخصية</h2>
        <p className="empty">{state === "error" ? "تعذّر تحميل الصفحة." : "لا يوجد مستخدم بهذا الاسم."}</p>
      </section>
    );
  }

  return (
    <section className="wrap">
      <div className="prof-head">
        <Avatar name={p.nickname} size={72} />
        <div>
          <h2 style={{ border: 0, margin: 0, padding: 0 }}>{p.nickname}</h2>
          <small>انضم في {fmt(p.created_at)}</small>
        </div>
      </div>
      <div style={{ margin: "1rem 0" }}><FriendButton userId={p.id} /></div>

      <h3 className="m-sec">المنشورات</h3>
      <Feed userId={p.id} />

      <h3 className="m-sec">تعليقات على الفصول</h3>
      {rows.length === 0 && <p className="empty">لم يكتب أي تعليق على الفصول بعد.</p>}
      {rows.map((c) => (
        <div key={c.id} className="c-item">
          <small>
            على <Link href={"/chapters/" + c.chapter_id}>{c.chapter ? "الفصل " + c.chapter.number + ": " + c.chapter.title : "فصل"}</Link> · {fmt(c.created_at)}
          </small>
          <p className="c-body">{c.body}</p>
        </div>
      ))}
    </section>
  );
}

export default function Profile() {
  return (
    <Suspense fallback={<section className="wrap"><p className="empty">جارٍ التحميل...</p></section>}>
      <Inner />
    </Suspense>
  );
    }
