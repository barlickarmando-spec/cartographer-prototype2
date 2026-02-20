import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartographer Prototype 2",
  description: "Next.js App Router + TypeScript + Tailwind",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
