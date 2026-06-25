"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { HelpCircle, Mail, ShieldAlert, FileText, Scale } from "lucide-react";

import { env } from "@/env";

export default function HelpCenterPage() {
  const SUPPORT_EMAIL = env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-3xl mx-auto">
      <div className="flex items-center space-x-2">
        <HelpCircle className="h-6 w-6 text-foreground" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Help Center</h2>
      </div>

      {/* ── FAQ SECTION ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">Frequently Asked Questions</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Quick answers to the most common questions about matching, privacy, and user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b border-border/40">
              <AccordionTrigger className="text-xs font-semibold text-foreground py-3">
                Is signup required to use Moots?
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed">
                No! Moots is designed as a guest-first platform. You can start chatting instantly with one click without creating an account or providing any personal details.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-b border-border/40">
              <AccordionTrigger className="text-xs font-semibold text-foreground py-3">
                How does matchmaking work?
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed">
                When you click "Start Chat", you enter our matchmaking queue. Our real-time engine pairs you with another online user instantly based on your interests and preferred language.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-b border-border/40">
              <AccordionTrigger className="text-xs font-semibold text-foreground py-3">
                Is my chat session anonymous?
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed">
                Yes. Guest users are allocated random IDs. We do not require, collect, or display real names, emails, or profile details for random chat sessions.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-b border-border/40">
              <AccordionTrigger className="text-xs font-semibold text-foreground py-3">
                How do I report someone?
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed">
                Every active chat contains an immediate "Report Stranger" control button. Flagged transcripts are immediately routed to our moderator dashboard for audit and ban actions.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── CONTACT SUPPORT ── */}
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 mb-2">
              <Mail className="h-4 w-4" />
            </div>
            <CardTitle className="text-xs font-bold text-foreground">Contact Support</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Need help resolving issues with your account or billing? Write to our support inbox.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-xs font-semibold text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </CardContent>
        </Card>

        {/* ── COMMUNITY GUIDELINES ── */}
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 mb-2">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <CardTitle className="text-xs font-bold text-foreground">Community Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              To keep Moots safe and fun for everyone, read our rules regarding harassment, spam, and media sharing.
            </p>
            <a href="/safety" className="text-xs font-semibold text-primary hover:underline">
              Read Guidelines
            </a>
          </CardContent>
        </Card>
      </div>

      {/* ── LEGAL PAGES ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground mb-2">
              <FileText className="h-4 w-4" />
            </div>
            <CardTitle className="text-xs font-bold text-foreground">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Understand what information we collect, how it is used, and your rights under GDPR.
            </p>
            <a href="/privacy" className="text-xs font-semibold text-primary hover:underline">
              View Privacy Policy
            </a>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground mb-2">
              <Scale className="h-4 w-4" />
            </div>
            <CardTitle className="text-xs font-bold text-foreground">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Read our general terms governing your usage of the Moots matchmaking client.
            </p>
            <a href="/terms" className="text-xs font-semibold text-primary hover:underline">
              View Terms
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
