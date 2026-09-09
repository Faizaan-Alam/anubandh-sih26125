import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANUBANDH Portal",
  description: "Decentralized identity, access control and digital asset management (SIH26125)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
