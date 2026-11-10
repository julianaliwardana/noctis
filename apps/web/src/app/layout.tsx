import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { themeInitScript } from "@/lib/theme";
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
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // The mobile top bar is the onyx rail in both themes, so the browser chrome matches it.
  themeColor: "#0e0f12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the script below adds .dark to <html> before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
