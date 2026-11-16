"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import Comments from "@/components/Comments";
import "../chapters.css";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" }) : "");

export default function Chapter() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [part, setPart] = useState(null);
  const [prev, setPrev] = useState(null);
  const [next, setNext] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    setState("loading");
    if (!/^\d+$/.test(String(id))) { setState("missing"); return; }
    (async () => {
      const s = sb();
      const [one, all, parts] = await Promise.all([
        s.from("chapters").select("id, number, title, content, cover_url, published_at, updated_at, part_id").eq("id", Number(id)).eq("status", "published").maybeSingle(),
        s.from("chapters").select("id, number, sort_order, part_id").eq("status", "published"),
        s.from("parts").select("id, title, sort_order"),
      ]);
      if (one.error) { setState("error"); return; }
      if (!one.data) { setState("missing"); return; }
      const pm = {};
      (parts.data || []).forEach((p) => { pm[p.id] = p; });
      const key = (x) => {
        const p = pm[x.part_id];
        return [p ? p.sort_order : 9999, p ? p.id : 0, x.sort_order, x.number];
      };
      const list = (all.data || []).sort((a, b) => {
        const x = key(a), y = key(b);
        for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i];
        return 0;
      });
      const i = list.findIndex((x) => x.id === one.data.id);
      setPrev(i > 0 ? list[i - 1] : null);
      setNext(i >= 0 && i < list.length - 1 ? list[i + 1] : null);
      setPart(pm[one.data.part_id] || null);
      setC(one.data);
      setState("ok");
      window.scrollTo(0, 0);
    })();
  }, [id]);

  if (state === "loading") return <article className="reader"><p className="empty">جارٍ التحميل...</p></article>;
  if (state !== "ok") {
    return (
      <article className="reader">
        <Link href="/chapters" className="back">العودة إلى الفصول</Link>
        <p className="empty">{state === "error" ? "تعذّر تحميل الفصل." : "هذا الفصل غير موجود."}</p>
      </article>
    );
  }

  const paragraphs = (c.content || "").split(/\n+/).filter(Boolean);
  const edited = c.updated_at && c.published_at && new Date(c.updated_at) - new Date(c.published_at) > 60000;

  return (
    <article className="reader">
      <Link href="/chapters" className="back">العودة إلى الفصول</Link>
      <header className="reader-head">
        {c.cover_url && <img src={c.cover_url} alt="" />}
        <small>{part ? part.title + " · " : ""}الفصل {c.number}</small>
        <h1>{c.title}</h1>
        <small>نُشر في {fmt(c.published_at)}{edited ? " · آخر تحديث " + fmt(c.updated_at) : ""}</small>
      </header>

      <div className="reader-body">
        {paragraphs.map((p, n) => <p key={n}>{p}</p>)}
      </div>

      <nav className="pager" aria-label="التنقل بين الفصول">
        {prev ? <Link href={"/chapters/" + prev.id}>الفصل السابق</Link> : <span />}
        {next ? <Link href={"/chapters/" + next.id}>الفصل التالي</Link> : <span />}
      </nav>

      <Comments chapterId={c.id} />
    </article>
  );
  }
