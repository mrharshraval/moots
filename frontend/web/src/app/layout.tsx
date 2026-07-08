import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/shared/layout/theme-provider"
import { TooltipProvider } from "@/shared/ui/tooltip"
import { Toaster } from "@/shared/ui/sonner"
import { cn } from "@/shared/utils/utils";
import { CookieBanner } from "@/shared/layout/cookie-banner"

export const metadata: Metadata = {
  title: {
    default: "Moots",
    template: "%s • Moots",
  },
  icons: {
    icon: [
      { url: "/brand/favicon/favicon.ico" },
      { url: "/brand/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/brand/app-icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/brand/favicon/site.webmanifest",
}

import { AuthProvider } from "@/providers/auth-provider"
import { QueryProvider } from "@/providers/query-provider"
import { WebSocketProvider } from "@/providers/websocket-provider"

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <AuthProvider>
          <QueryProvider>
            <WebSocketProvider>
              <ThemeProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                  <CookieBanner />
                </TooltipProvider>
              </ThemeProvider>
            </WebSocketProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
