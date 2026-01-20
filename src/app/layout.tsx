import type { Metadata } from "next";
import React from "react";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LaundryProvider } from '@/contexts/LaundryContext';
import { UiProvider } from '@/contexts/UiContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dorm Laundry Queue",
  description: "A simple web app to manage laundry queues in a dorm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`
  try {
    const t = localStorage.getItem('appTheme');
    const html = document.documentElement;
    if (t === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  } catch (e) {}
`}</Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 min-h-screen`}
      >
        <UiProvider>
          <LaundryProvider>{children}</LaundryProvider>
        </UiProvider>
      </body>
    </html>
  );
}
