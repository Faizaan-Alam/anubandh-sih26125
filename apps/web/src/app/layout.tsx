import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "ANUBANDH Portal",
  description: "Decentralized identity, access control and digital asset management (SIH26125)"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="forest" suppressHydrationWarning>
      <body className="min-h-screen bg-base-200 text-base-content antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
