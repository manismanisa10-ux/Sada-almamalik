import Link from "next/link";
import Crown from "@/components/Crown";
import Feed from "@/components/Feed";
import { NAV } from "@/components/nav";
import { db } from "@/lib/supabase";

export const revalidate = 60;

const fmt = (d) => new Date(d).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });

async function load() {
  const sb = db();
  if (!sb) return { chapters: [], characters: [], settings: {}, offline: true };
  const [c, p, s] = await Promise.all([
    sb.from("chapters").select("id, number, title, cover_url, published_at, parts(title)")
      .eq("status", "published").order("published_at", { ascending: false }).limit(3),
    sb.from("characters").select("id, name, description, image_url, kingdoms(name)")
      .order("sort_order").limit(4),
    sb.from("site_settings").select("key, value"),
  ]);
  const settings = Object.fromEntries((s.data || []).map((r) => [r.key, r.value]));
  return { chapters: c.data || [], characters: p.data || [], settings };
}

export default async function Home() {
  const { chapters, characters, settings, offline } = await load();
  const links = NAV.filter((n) => n.ready && n.href !== "/");

  return (
    <>
      <section className="hero" style={settings.hero_image_url ? { backgroundImage: `linear-gradient(rgba(46,33,71,.55), rgba(46,33,71,.8)), url(${settings.hero_image_url})` } : undefined}>
        <div className="frame">
          <Crown size={72} />
          <h1>صدى الممالك</h1>
          <p>{settings.tagline || "خمس ممالك، وعروش تتنازعها الأسرار، وصدى حرب لم تنتهِ بعد."}</p>
          {links.length > 0 && (
            <div className="hero-links">
              {links.map((n) => <Link key={n.href} href={n.href} className="btn">{n.label}</Link>)}
            </div>
          )}
        </div>
      </section>

      <section className="wrap about">
        <h2>عن الرواية</h2>
        <p>{settings.about || "رواية فانتازيا سياسية تدور في عالم تحكمه خمس ممالك: فيلدورا ودياران وكراتان وسيراسكا وأرمينيا. هنا تقرأ الفصول، وتتأمل الخرائط، وتتعرف على أصحاب التيجان وخصومهم."}</p>
      </section>

      {offline && (
        <section className="wrap notice">قاعدة البيانات غير متصلة بعد. أضف متغيرات Supabase في إعدادات Vercel.</section>
      )}

      <section className="wrap">
        <h2>أحدث الفصول</h2>
        {chapters.length === 0 ? (
          <p className="empty">لم يُنشر أي فصل بعد. سيظهر هنا أحدث ما تنشره من لوحة الإدارة.</p>
        ) : (
          <ul className="list">
            {chapters.map((c) => (
              <li key={c.id}>
                <Link href={`/chapters/${c.id}`} style={{ display: "block", textDecoration: "none" }}>
                  <small>{c.parts?.title} · الفصل {c.number}</small>
                  <h3>{c.title}</h3>
                  <small>نُشر في {fmt(c.published_at)}</small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="wrap">
        <h2>منشورات الأعضاء</h2>
        <Feed />
      </section>

      <section className="wrap">
        <h2>من الشخصيات</h2>
        {characters.length === 0 ? (
          <p className="empty">لم تُضف شخصيات بعد. أضفها من لوحة الإدارة لتظهر هنا.</p>
        ) : (
          <div className="grid">
            {characters.map((c) => (
              <figure key={c.id}>
                {c.image_url && <img src={c.image_url} alt={c.name} loading="lazy" />}
                <figcaption><strong>{c.name}</strong><small>{c.kingdoms?.name}</small></figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </>
  );
          }
