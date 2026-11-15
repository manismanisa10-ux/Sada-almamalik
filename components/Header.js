import Link from "next/link";
import Crown from "./Crown";
import AuthNav from "./AuthNav";
import { NAV } from "./nav";

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Crown size={34} />
        <span>صدى الممالك</span>
      </Link>
      <nav aria-label="التنقل الرئيسي">
        {NAV.filter((n) => n.ready).map((n) => (
          <Link key={n.href} href={n.href}>{n.label}</Link>
        ))}
        <AuthNav />
      </nav>
    </header>
  );
}
