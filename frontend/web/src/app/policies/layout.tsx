"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/providers/auth-provider"
import { Separator } from "@/shared/ui/separator"
import { LandingHeader } from "@/shared/layout/landing-header"

const POLICY_LINKS = [
  { label: "Terms of Use", href: "/policies/terms" },
  { label: "Privacy Policy", href: "/policies/privacy" },
  { label: "Cookie Policy", href: "/policies/cookies" },
  { label: "Community Guidelines", href: "/policies/community-guidelines" },
  { label: "Safety Center", href: "/policies/safety" },
  { label: "Acceptable Use", href: "/policies/acceptable-use" },
  { label: "Content Moderation", href: "/policies/content-moderation" },
  { label: "Copyright Policy", href: "/policies/copyright" },
  { label: "Legal Requests", href: "/policies/legal-requests" },
]

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [sections, setSections] = React.useState<{ id: string; text: string }[]>([])
  const [activeSectionId, setActiveSectionId] = React.useState<string>("")
  const activeIdRef = React.useRef("")

  React.useEffect(() => {
    activeIdRef.current = activeSectionId
  }, [activeSectionId])

  React.useEffect(() => {
    // We search inside the main element for h2 headers
    const mainEl = document.querySelector(".policies-content-wrapper")
    if (!mainEl) return

    // Query all h2 headings
    const h2Elements = mainEl.querySelectorAll("h2")
    const newSections: { id: string; text: string }[] = []

    h2Elements.forEach((h2, index) => {
      const text = h2.textContent || ""
      const id = h2.id || `section-${index}`
      h2.id = id
      
      // Add smooth scroll class/behavior to the target
      h2.classList.add("scroll-mt-24")
      
      newSections.push({ id, text })
    })

    setSections(newSections)
    if (newSections.length > 0) {
      setActiveSectionId(newSections[0].id)
    }

    const handleScroll = () => {
      let currentActiveId = ""
      const scrollPosition = window.scrollY + 130 // Header offset + threshold spacing

      h2Elements.forEach((h2) => {
        const element = h2 as HTMLElement
        // Calculate offset position relative to document top
        if (element.offsetTop <= scrollPosition) {
          currentActiveId = element.id
        }
      })

      if (currentActiveId && currentActiveId !== activeIdRef.current) {
        setActiveSectionId(currentActiveId)
      }
    }

    window.addEventListener("scroll", handleScroll)
    // Run initially
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [pathname, children])

  const handleSectionClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const yOffset = -90 // sticky header offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: "smooth" })
      setActiveSectionId(id)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-sans antialiased selection:bg-neutral-800 selection:text-white">
      {/* ── HEADER ── */}
      <LandingHeader />

      {/* ── MAIN LAYOUT CONTAINER ── */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col md:flex-row px-6 py-12 gap-12 lg:gap-16">
        
        {/* Left Sidebar - Sticky & self-starting */}
        <aside className="w-full md:w-64 md:shrink-0 md:sticky md:top-28 md:self-start flex flex-col gap-6">
          {/* Table of Contents Section */}
          {sections.length > 0 && (
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-4 px-3.5">
                Table of contents
              </span>
              <nav className="flex flex-col gap-0.5">
                {sections.map((sec) => {
                  const isActive = activeSectionId === sec.id
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={(e) => handleSectionClick(e, sec.id)}
                      className={`flex py-2 px-3.5 rounded-lg text-[13px] font-medium leading-relaxed text-left border border-transparent ${
                        isActive
                          ? "bg-neutral-900 text-white font-semibold"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/30"
                      }`}
                    >
                      {sec.text}
                    </a>
                  )
                })}
              </nav>
            </div>
          )}
        </aside>

        {/* Right Policy Content Area */}
        <main className="flex-1 min-w-0 md:pl-8">
          <div className="max-w-2xl policies-content-wrapper">
            <style dangerouslySetInnerHTML={{__html: `
              .policies-content-wrapper h1 {
                font-size: 2.25rem !important; /* 36px */
                font-weight: 800 !important;
                letter-spacing: -0.03em !important;
                color: #ffffff !important;
                margin-top: 0.5rem !important;
                margin-bottom: 0.75rem !important;
                line-height: 2.75rem !important;
              }
              .policies-content-wrapper h2 {
                font-size: 1.375rem !important; /* 22px */
                font-weight: 700 !important;
                letter-spacing: -0.02em !important;
                color: #ffffff !important;
                margin-top: 2.75rem !important;
                margin-bottom: 1rem !important;
                padding-top: 0 !important;
                line-height: 1.875rem !important;
              }
              .policies-content-wrapper p, 
              .policies-content-wrapper li {
                font-size: 1rem !important; /* 16px */
                line-height: 1.8 !important;
                color: #d4d4d4 !important; /* neutral-300 */
                margin-bottom: 1.5rem !important;
              }
              .policies-content-wrapper ul,
              .policies-content-wrapper ol {
                margin-top: 0.75rem !important;
                margin-bottom: 1.5rem !important;
                list-style-type: disc !important;
                padding-left: 1.5rem !important;
              }
              .policies-content-wrapper li {
                margin-bottom: 0.75rem !important;
              }
              .policies-content-wrapper .h-px {
                background-color: #171717 !important; /* neutral-900 */
                margin-top: 2rem !important;
                margin-bottom: 2rem !important;
                height: 1px !important;
              }
              .policies-content-wrapper .space-y-2 {
                margin-bottom: 2rem !important;
              }
              .policies-content-wrapper .text-xs.text-muted-foreground {
                font-size: 0.875rem !important; /* 14px */
                color: #737373 !important; /* neutral-500 */
              }
              .policies-content-wrapper .space-y-4 {
                margin-top: 2rem !important;
              }
            `}} />
            {children}
          </div>
        </main>
      </div>

      {/* ── CONSISTENT FOOTER (Dark Theme Aligned) ── */}
      <footer className="py-12 bg-black text-neutral-400 mt-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-left">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[13px] text-white">Platform</span>
              <Link href="/chat" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Random Chat</Link>
              <Link href="/communities" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Communities</Link>
              <Link href="/blog" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Blog</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[13px] text-white">Information</span>
              <Link href="/about" className="text-[13px] text-neutral-400 hover:text-white transition-colors">About Us</Link>
              <Link href="/policies/safety" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Safety Center</Link>
              <Link href="/policies/community-guidelines" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Community Guidelines</Link>
              <Link href="/help" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Help Center / FAQs</Link>
            </div>
            <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
              <span className="font-semibold text-[13px] text-white">Legal</span>
              <Link href="/policies/terms" className={`text-[13px] hover:text-white transition-colors ${pathname === "/policies/terms" ? "text-white underline-offset-2" : "text-neutral-400"}`}>Terms of Use</Link>
              <Link href="/policies/privacy" className={`text-[13px] hover:text-white transition-colors ${pathname === "/policies/privacy" ? "text-white underline-offset-2" : "text-neutral-400"}`}>Privacy Policy</Link>
              <Link href="/policies/cookies" className={`text-[13px] hover:text-white transition-colors ${pathname === "/policies/cookies" ? "text-white underline-offset-2" : "text-neutral-400"}`}>Cookie Policy</Link>
              <Link href="/policies/acceptable-use" className={`text-[13px] hover:text-white transition-colors ${pathname === "/policies/acceptable-use" ? "text-white underline-offset-2" : "text-neutral-400"}`}>Acceptable Use</Link>
              <Link href="/policies/content-moderation" className={`text-[13px] hover:text-white transition-colors ${pathname === "/policies/content-moderation" ? "text-white underline-offset-2" : "text-neutral-400"}`}>Content Moderation</Link>
              <Link href="/policies/copyright" className={`text-[13px] hover:text-white transition-colors ${pathname === "/policies/copyright" ? "text-white underline-offset-2" : "text-neutral-400"}`}>Copyright Policy</Link>
              <Link href="/policies/legal-requests" className={`text-[13px] hover:text-white transition-colors ${pathname === "/policies/legal-requests" ? "text-white underline-offset-2" : "text-neutral-400"}`}>Legal Requests</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[13px] text-white">Connect</span>
              <Link href="/contact" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Contact Support</Link>
            </div>
          </div>

          <Separator className="bg-transparent mb-8" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/brand/brand-marks/monochrome/White%20Filled.svg"
                alt="Moots"
                className="h-7 w-auto"
              />
              <span className="font-semibold text-xs tracking-tight text-white">Moots</span>
            </div>
            <p className="text-[12px] text-neutral-500">
              © {new Date().getFullYear()} Moots. All rights reserved. Talk anonymously, safely, and instantly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
