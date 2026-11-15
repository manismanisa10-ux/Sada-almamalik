import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import "../chapters.css";
import Comments from "@/components/Comments";

export const dynamic = "force-dynamic";

const fmt = (d) => new Date(d).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
const key = (c) => [c.parts?.sort_order ?? 9999, c.sort_order, c.number];
const cmp = (a, b) => {
  for (let i = 0; i < 3; i++) {
    const d = key(a)[i] - key(b)[i];
    if (d) return d;
  }
  return 0;
};

export default async function Chapter({ params }) {
  if (!/^\d+$/.test(params.id)) notFound();
  const sb = db();
  if (!sb) notFound();

  const { data: c } = await sb
    .from("chapters")
    .select("id, number, title, content, cover_url, published_at, updated_at, parts(title)")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();
  if (!c) notFound();

  const { data: all } = await sb
    .from("chapters")
    .select("id, number, sort_order, parts(sort_order)")
    .eq("status", "published");
  const list = (all || []).sort(cmp);
  const i = list.findIndex((x) => x.id === c.id);
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;

  const paragraphs = (c.content || "").split(/\n+/).filter(Boolean);
  const edited = c.updated_at && new Date(c.updated_at) - new Date(c.published_at) > 60000;

  return (
    <article className="reader">
      <Link href="/chapters" className="back">العودة إلى الفصول</Link>
      <header className="reader-head">
        {c.cover_url && <img src={c.cover_url} alt="" />}
        <small>{c.parts?.title ? `${c.parts.title} · ` : ""}الفصل {c.number}</small>
        <h1>{c.title}</h1>
        <small>نُشر في {fmt(c.published_at)}{edited ? ` · آخر تحديث ${fmt(c.updated_at)}` : ""}</small>
      </header>

      <div className="reader-body">
        {paragraphs.map((p, n) => <p key={n}>{p}</p>)}
      </div>

      <nav className="pager" aria-label="التنقل بين الفصول">
        {prev ? <Link href={`/chapters/${prev.id}`}>الفصل السابق</Link> : <span />}
        {next ? <Link href={`/chapters/${next.id}`}>الفصل التالي</Link> : <span />}
      </nav>
        <Comments chapterId={c.id} />
    </article>
  );
    }
