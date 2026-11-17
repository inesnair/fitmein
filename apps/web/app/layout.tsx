import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["500", "600", "700"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans" });

export const metadata: Metadata = {
  title: "FitMeIn",
  description: "Vérifie si une offre est faite pour toi, génère ton CV ATS et suis tes candidatures.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "FitMeIn" },
};

export const viewport: Viewport = {
  themeColor: "#0B0910",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sora.variable} ${dmSans.variable}`}>
      <body className="font-sans text-[15px] leading-relaxed lg:pl-[92px]">
        <AuthGate>
          <main className="mx-auto grid max-w-3xl gap-4 px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] lg:pb-10">
            {children}
          </main>
          <TabBar />
        </AuthGate>
      </body>
    </html>
  );
}
