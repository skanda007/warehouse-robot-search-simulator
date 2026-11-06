import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton-google",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-google",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Warehouse Autonomy — Intelligent Shelf Retrieval Using Uninformed Search",
  description: "Warehouse robot simulator demonstrating BFS, DFS and Uniform-Cost Search with an authoritative Python search engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable}`}>
      <body className="antialiased selection:bg-[#c8ff2e]/30 selection:text-[#f3f4f1]">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
