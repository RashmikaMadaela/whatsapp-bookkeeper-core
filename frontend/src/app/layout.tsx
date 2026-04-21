import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhatsApp Bookkeeper",
  description: "Cafe income & expense tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-gray-50 text-gray-900">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
