import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Noctis",
  description: "Tasks, habits, finance, passwords, and an AI assistant — one calm daily instrument.",
  manifest: "/manifest.json",
  icons: {
    icon: "https://cdn.julianwardana.dev/Noctis/noctis.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f8b8d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(inter.variable, jetbrainsMono.variable, "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
