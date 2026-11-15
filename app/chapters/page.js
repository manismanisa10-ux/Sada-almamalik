import Link from "next/link";
import { db } from "@/lib/supabase";
import "./chapters.css";

export const metadata = { title: "الفصول — صدى الممالك" };
export const dynamic = "force-dynamic";

const key = (c) => [c.parts?.sort_order ?? 9999, c.sort_order, c.number];
const cmp = (a, b) => {
  for (let i = 0; i < 3; i++) {
    const d = key(a)[i] - key(b)[i];
    if (d) return d;
  }
  return 0;
};

export default async function Chapters({ searchParams }) {
  const q = String(searchParams?.q || "").trim().slice(0, 60);
  const sb = db();
  let chapters = [];
  let failed = !sb;

  if (sb) {
    let query = sb
      .from("chapters")
      .select("id, number, title, cover_url, sort_order, parts(title, sort_order)")
      .eq("status", "published");
    if (q) {
      if (/^\d+$/.test(q)) query = query.eq("number", Number(q));
      else query = query.ilike("title", `%${q.replace(/[%_,()]/g, " ")}%`);
    }
    const res = await query;
    chapters = res.data || [];
    failed = !!res.error;
  }

  chapters.sort(cmp);
  const groups = [];
  for (const c of chapters) {
    const title = c.parts?.title || "فصول أخرى";
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(c);
    else groups.push({ title, items: [c] });
  }

  return (
    <section className="wrap">
      <h2>الفصول</h2>
      <form className="search" action="/chapters" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="ابحث بعنوان الفصل أو رقمه" aria-label="بحث في الفصول" />
        <button type="submit">بحث</button>
      </form>

      {failed && <p className="empty">تعذّر تحميل الفصول. حاول مرة أخرى بعد قليل.</p>}
      {!failed && chapters.length === 0 && (
        <p className="empty">{q ? "لا توجد فصول تطابق بحثك." : "لم يُنشر أي فصل بعد."}</p>
      )}

      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="part-title">{g.title}</h3>
          {g.items.map((c) => (
            <Link key={c.id} href={`/chapters/${c.id}`} className="chap-link">
              <span className="chap-num">{c.number}</span>
              {c.cover_url && <img src={c.cover_url} alt="" loading="lazy" />}
              <span>{c.title}</span>
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
}
