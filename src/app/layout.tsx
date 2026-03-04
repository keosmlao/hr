import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Lao } from "next/font/google";
import "./globals.css";

const appSans = Noto_Sans_Lao({
  variable: "--font-app-sans",
  subsets: ["lao", "latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HRM - ລະບົບບໍລິຫານພະນັກງານ",
  description: "ລະບົບບໍລິຫານຊັບພະຍາກອນມະນຸດ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lo">
      <body className={`${appSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
