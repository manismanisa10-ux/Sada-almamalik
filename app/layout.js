import { Amiri, Tajawal } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-display" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"], variable: "--font-body" });

export const metadata = {
  title: "صدى الممالك",
  description: "مكتبة رقمية لرواية «صدى الممالك»: الفصول والخرائط والشخصيات.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${amiri.variable} ${tajawal.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
