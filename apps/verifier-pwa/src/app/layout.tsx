import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANUBANDH Verifier",
  description: "Risk-tiered offline asset verification",
  manifest: "/manifest.json",
  themeColor: "#1b2a4a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1b2a4a" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
