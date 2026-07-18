import type { Metadata } from "next"
import Link from "next/link"
import {
  MessageSquare,
  Users,
  Shield,
  Zap,
  Globe,
  Tag,
  History,
  Heart,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react"

import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/shared/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion"
import { Separator } from "@/shared/ui/separator"
import { Badge } from "@/shared/ui/badge"

import { LandingHeader } from "@/shared/layout/landing-header"

export const metadata: Metadata = {
  title: "Moots - Talk to Someone New Instantly | Anonymous Random Chat",
  description:
    "Meet people around the world with Moots. No signup required, zero friction. Instant matching for anonymous, safe, and fun chat with strangers.",
  keywords: ["Random Chat", "Anonymous Chat", "Chat With Strangers", "Meet New People Online", "Online Chat"],
}

export default function LandingPage() {
  // JSON-LD Structured Data for AEO/SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is signup required?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No, signup is completely optional. Moots is designed as a guest-first platform so you can start chatting anonymously within seconds of landing.",
        },
      },
      {
        "@type": "Question",
        "name": "Is Moots anonymous?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Guest users are allocated random IDs. We do not require, collect, or display real names, emails, or profile details for random chat sessions.",
        },
      },
      {
        "@type": "Question",
        "name": "How does matching work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "When you click 'Start Chat', you enter our matchmaking queue. Our real-time engine pairs you with another online user instantly. You can choose to narrow down matches by adding interest tags or language filters.",
        },
      },
      {
        "@type": "Question",
        "name": "How do I report someone?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Every active chat contains an immediate 'Report Stranger' control button. Flagged transcripts are immediately routed to our moderator dashboard for audit and ban actions.",
        },
      },
    ],
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground dark-first">
      {/* JSON-LD Schema Injector */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-32 lg:py-48 bg-background">
        <div className="absolute inset-0 max-w-[1400px] mx-auto z-0">
          <div className="w-full h-full relative rounded-2xl lg:rounded-[2rem] overflow-hidden bg-muted/20 border border-border/50">
            <img
              src="/assets/hero-v12.png"
              alt="Chatting with stranger"
              className="w-full h-full object-cover object-center opacity-90 dark:opacity-70"
            />
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-7xl relative z-10 flex flex-col justify-center h-full">
          <div className="max-w-xl">
            <h1 className="text-5xl sm:text-6xl font-medium tracking-tight text-white mb-3 leading-[0.9]">
              Private conversations
            </h1>
            <p className="text-[15px] text-white/90 mb-8 leading-relaxed max-w-md drop-shadow-sm">
              Meet people around the world anonymously. No registration, no onboarding, no friction. Just one click to connect.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 text-sm font-semibold px-8 shadow-lg shadow-primary/20">
                <Link href="/chat">
                  Start Chat
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Frequently Asked Questions</h2>
            <p className="text-xs text-muted-foreground mt-2">Answers to common queries about matchmaking, privacy, and guidelines</p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "Is signup required to use Moots?",
                a: "No! Moots is a guest-first platform. You can start chatting instantly with one click without creating an account or providing any personal details.",
              },
              {
                q: "Is Moots anonymous?",
                a: "Yes. Guest users are allocated random IDs. We do not require, collect, or display real names, emails, or profile details for random chat sessions.",
              },
              {
                q: "How does matching work?",
                a: "When you click 'Start Chat', you enter our matchmaking queue. Our real-time engine pairs you with another online user instantly. You can choose to narrow down matches by adding interest tags or language filters.",
              },
              {
                q: "How do I report someone?",
                a: "Every active chat contains an immediate 'Report Stranger' control button. Flagged transcripts are immediately routed to our moderator dashboard for audit and ban actions.",
              },
            ].map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-none">
                <AccordionTrigger className="text-sm font-semibold text-foreground py-4 ">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background text-muted-foreground">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-left">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[13px] text-foreground">Platform</span>
              <Link href="/chat" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Random Chat</Link>
              <Link href="/communities" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Communities</Link>
              <Link href="/blog" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[13px] text-foreground">Information</span>
              <Link href="/about" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">About Us</Link>
              <Link href="/policies/safety" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Safety Center</Link>
              <Link href="/policies/community-guidelines" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Community Guidelines</Link>
              <Link href="/help" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Help Center / FAQs</Link>
            </div>
            <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
              <span className="font-semibold text-[13px] text-foreground">Legal</span>
              <Link href="/policies/terms" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Terms of Use</Link>
              <Link href="/policies/privacy" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/policies/cookies" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</Link>
              <Link href="/policies/acceptable-use" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Acceptable Use</Link>
              <Link href="/policies/content-moderation" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Content Moderation</Link>
              <Link href="/policies/copyright" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Copyright Policy</Link>
              <Link href="/policies/legal-requests" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Legal Requests</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[13px] text-foreground">Connect</span>
              <Link href="/contact" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Contact Support</Link>
            </div>
          </div>

          <div className="h-px bg-transparent mb-8 w-full" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/brand/brand-marks/monochrome/Balck%20Filled.svg"
                alt="Moots"
                className="h-7 w-auto dark:hidden"
              />
              <img
                src="/brand/brand-marks/monochrome/White%20Filled.svg"
                alt="Moots"
                className="h-7 w-auto hidden dark:block"
              />
              <span className="font-semibold text-xs tracking-tight text-foreground">Moots</span>
            </div>
            <p className="text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} Moots. All rights reserved. Talk anonymously, safely, and instantly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
