import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { HydrationFix } from "@/components/HydrationFix";
import { ThemeApplier } from "@/components/ThemeApplier";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TrizenAI Photo Sharing Platform | High-Performance Photography Delivery",
  description: "Enterprise photo sharing, team collaboration, multi-shooter ingestion, and client PIN galleries.",
  icons: {
    icon: "/img/favicon.png",
    apple: "/img/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head suppressHydrationWarning />
      <body
        className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col"
        suppressHydrationWarning
      >
        <HydrationFix />
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
