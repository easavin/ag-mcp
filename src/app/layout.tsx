import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AppSessionProvider from "@/components/SessionProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Farm MCP - Agricultural Chat Interface",
  description: "A Claude-style chat interface that connects to John Deere Operations Center via MCP (Model Context Protocol)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppSessionProvider>
          {children}
        </AppSessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
