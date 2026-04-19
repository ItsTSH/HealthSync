import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { Providers } from "./providers";
import "./bones/registry";

const interSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "HealthSync",
  description: "Medical Documentation App",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${interSans.variable} ${jetBrainsMono.variable} ${plusJakartaSans.variable} flex bg-secondary`}
      >
        <Providers defaultOpen={defaultOpen}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
