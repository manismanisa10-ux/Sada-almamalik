import Link from "next/link";
import { db } from "@/lib/supabase";
import "../social.css";

export const dynamic = "force-dynamic";

const fmt = (d) => new Date(d).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });

export default async function Profile({ searchParams }) {
  const nick = String(searchParams?.u || "").trim().slice(0, 24);
  const sb = db();
  let p = null;
  if (sb && nick) {
    const r = await sb.from("profiles").select("id, nickname, created_at").eq("nickname", nick).maybeSingle();
    p = r.data;
  }
  if (!p) {
    return (
      <section className="wrap">
        <h2>الصفحة الشخصية</h2>
        <p className="empty">لا يوجد مستخدم بهذا الاسم.</p>
      </section>
    );
  }
  const { data } = await sb
    .from("comments")
    .select("id, body, created_at, chapter_id, chapters(title, number)")
    .eq("user_id", p.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const list = data || [];

  return (
    <section className="wrap">
      <h2>{p.nickname}</h2>
      <small>انضم في {fmt(p.created_at)}</small>
      <h3 style={{ margin: "1.5rem 0 .75rem" }}>التعليقات</h3>
      {list.length === 0 && <p className="empty">لم يكتب أي تعليق بعد.</p>}
      {list.map((c) => (
        <div key={c.id} className="c-item">
          <small>
            على <Link href={`/chapters/${c.chapter_id}`}>{c.chapters ? `الفصل ${c.chapters.number}: ${c.chapters.title}` : "فصل"}</Link> · {fmt(c.created_at)}
          </small>
          <p className="c-body">{c.body}</p>
        </div>
      ))}
    </section>
  );
}
