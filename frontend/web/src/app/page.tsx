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

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "OpenChat - Talk to Someone New Instantly | Anonymous Random Chat",
  description:
    "Meet people around the world with OpenChat. No signup required, zero friction. Instant matching for anonymous, safe, and fun chat with strangers.",
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
          "text": "No, signup is completely optional. OpenChat is designed as a guest-first platform so you can start chatting anonymously within seconds of landing.",
        },
      },
      {
        "@type": "Question",
        "name": "Is OpenChat anonymous?",
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
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              O
            </div>
            <span className="font-semibold text-sm tracking-tight">OpenChat</span>
          </div>

          <nav className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs h-8">
              <Link href="/signup">Sign Up</Link>
            </Button>
            <Button asChild size="sm" className="text-xs h-8">
              <Link href="/chat">Start Chat</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 border-b border-border bg-radial-glow">
        <div className="container mx-auto px-4 text-center max-w-4xl relative z-10">
          <Badge variant="secondary" className="mb-4 text-[10px] uppercase tracking-wider font-semibold bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" /> No Signup Required
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground mb-6 leading-tight">
            Talk to Someone New <span className="text-primary">Instantly</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Meet people around the world anonymously. No registration, no onboarding, no friction. Just one click to connect.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 text-sm font-semibold px-8 shadow-lg shadow-primary/20">
              <Link href="/chat" className="flex items-center gap-2">
                START CHAT NOW
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 text-sm px-8">
              <Link href="/signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Anonymous Chat", desc: "No names, emails, or credentials required.", icon: Shield },
              { title: "No Signup Needed", desc: "Start conversations instantly with one click.", icon: Zap },
              { title: "Real-Time Matching", desc: "Sub-second matchmaking connections.", icon: Globe },
              { title: "Safety & Moderation", desc: "24/7 moderator audit and simple report triggers.", icon: Shield },
            ].map((indicator, index) => {
              const Icon = indicator.icon
              return (
                <div key={index} className="flex flex-col items-center lg:items-start text-center lg:text-left gap-2 p-2">
                  <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-xs text-foreground mt-2">{indicator.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{indicator.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">How It Works</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Connecting with strangers is as simple as it gets.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {[
              { step: "01", title: "Start Chat", desc: "Click the CTA button on the landing page." },
              { step: "02", title: "Get Matched", desc: "Our real-time engine pairs you with an active peer." },
              { step: "03", title: "Talk", desc: "Share ideas anonymously inside a clean screen." },
              { step: "04", title: "Next Stranger", desc: "Skip anytime to meet someone new instantly." },
            ].map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center gap-2 relative">
                <span className="text-4xl font-black text-primary/10 select-none">{step.step}</span>
                <h3 className="font-bold text-xs text-foreground mt-1">{step.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/10 border-b border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Platform Features</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Tools constructed to optimize matching and retention.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Random Chat", desc: "Meet random people around the world without filters.", icon: MessageSquare },
              { title: "Interest Matching", desc: "Add tags to match with peers sharing common hobbies.", icon: Tag },
              { title: "Language Matching", desc: "Target strangers speaking your preferred dialect.", icon: Globe },
              { title: "Communities", desc: "Join public group chatrooms organized by interests.", icon: Users },
              { title: "Friends List", desc: "Save contacts from matches and message them directly.", icon: Heart },
              { title: "Saved History", desc: "Access archived transcripts of your past conversations.", icon: History },
            ].map((feat, index) => {
              const Icon = feat.icon
              return (
                <Card key={index} className="bg-card border-border hover:border-border/80 transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 mb-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-xs font-bold text-foreground">{feat.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Community Preview */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Trending Communities</h2>
              <p className="text-xs text-muted-foreground mt-1">Jump into shared active chats right now.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/communities">Explore All Communities</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: "Gaming Lounge", slug: "gaming", count: 1240, desc: "Talk about your favorite PC/console games." },
              { title: "React Developers", slug: "react", count: 820, desc: "Front-end engineering, questions, and coding tips." },
              { title: "LoFi Chill Beats", slug: "lofi", count: 530, desc: "Relax and listen to beats together with friends." },
            ].map((room) => (
              <Card key={room.slug} className="bg-card border-border flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="secondary" className="text-[9px] px-1 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">
                      {room.count} Active
                    </Badge>
                  </div>
                  <CardTitle className="text-xs font-bold text-foreground">{room.title}</CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-1 leading-normal">
                    {room.desc}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="p-4 pt-2 border-t border-border/40">
                  <Button asChild size="sm" className="w-full text-[10px] h-8">
                    <Link href={`/c/${room.slug}/chat`}>Join Room</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 bg-muted/5 border-b border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <HelpCircle className="h-8 w-8 text-primary mx-auto mb-2 opacity-80" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Frequently Asked Questions</h2>
            <p className="text-xs text-muted-foreground mt-2">Answers to common queries about matchmaking, privacy, and guidelines.</p>
          </div>

          <Accordion type="single" collapsible className="w-full border-t border-border">
            {[
              {
                q: "Is signup required to use OpenChat?",
                a: "No! OpenChat is a guest-first platform. You can start chatting instantly with one click without creating an account or providing any personal details.",
              },
              {
                q: "Is OpenChat anonymous?",
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
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-border">
                <AccordionTrigger className="text-xs font-semibold text-foreground py-4 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card text-card-foreground border-t border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-xs text-foreground">Platform</span>
              <Link href="/chat" className="text-[11px] text-muted-foreground hover:text-foreground">Random Chat</Link>
              <Link href="/communities" className="text-[11px] text-muted-foreground hover:text-foreground">Communities</Link>
              <Link href="/blog" className="text-[11px] text-muted-foreground hover:text-foreground">Blog</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-xs text-foreground">Information</span>
              <Link href="/about" className="text-[11px] text-muted-foreground hover:text-foreground">About Us</Link>
              <Link href="/safety" className="text-[11px] text-muted-foreground hover:text-foreground">Safety Guidelines</Link>
              <Link href="/help" className="text-[11px] text-muted-foreground hover:text-foreground">Help Center / FAQs</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-xs text-foreground">Legal</span>
              <Link href="/privacy" className="text-[11px] text-muted-foreground hover:text-foreground">Privacy Policy</Link>
              <Link href="/terms" className="text-[11px] text-muted-foreground hover:text-foreground">Terms of Service</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-xs text-foreground">Connect</span>
              <Link href="/contact" className="text-[11px] text-muted-foreground hover:text-foreground">Contact Support</Link>
            </div>
          </div>

          <Separator className="bg-border/50 mb-8" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                O
              </div>
              <span className="font-semibold text-xs tracking-tight text-foreground">OpenChat</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              © {new Date().getFullYear()} OpenChat. All rights reserved. Talk anonymously, safely, and instantly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
