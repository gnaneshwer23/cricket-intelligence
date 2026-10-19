import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
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

/* Display: Sora, used light + semibold for mixed-weight headlines. */
const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Cricket Intelligence",
  description:
    "Live scores, ball-by-ball history and an AI analyst that shows its working.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
