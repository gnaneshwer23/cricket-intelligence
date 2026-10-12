import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/* Geometric display — retail-sports clarity (Voltace cue), not editorial serif. */
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "CricketOS · Cricket Intelligence",
  description:
    "Follow the match. Understand the game. Explore what happens next — grounded cricket intelligence with honest DEMO labels.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} dark h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
