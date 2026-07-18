"use client"

import * as React from "react"
import { Shield, X, Check } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Switch } from "@/shared/ui/switch"

export function CookieBanner() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showPreferences, setShowPreferences] = React.useState(false)
  
  // Cookie states
  const [analytics, setAnalytics] = React.useState(true)
  const [marketing, setMarketing] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem("moots-cookies-consent")
      if (!consent) {
        setIsOpen(true)
      }
    }
  }, [])

  const handleAcceptAll = () => {
    const preferences = { essential: true, analytics: true, marketing: true }
    localStorage.setItem("moots-cookies-consent", JSON.stringify(preferences))
    setIsOpen(false)
    window.dispatchEvent(new Event("moots:cookie-consent-updated"))
  }

  const handleRejectAll = () => {
    const preferences = { essential: true, analytics: false, marketing: false }
    localStorage.setItem("moots-cookies-consent", JSON.stringify(preferences))
    setIsOpen(false)
    window.dispatchEvent(new Event("moots:cookie-consent-updated"))
  }

  const handleSavePreferences = () => {
    const preferences = { essential: true, analytics, marketing }
    localStorage.setItem("moots-cookies-consent", JSON.stringify(preferences))
    setIsOpen(false)
    window.dispatchEvent(new Event("moots:cookie-consent-updated"))
  }

  // Allow triggering preference manager from external triggers (e.g. settings)
  React.useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true)
      setShowPreferences(true)
    }
    window.addEventListener("moots:manage-cookie-preferences", handleTrigger)
    return () => {
      window.removeEventListener("moots:manage-cookie-preferences", handleTrigger)
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-32px)] xs:w-[440px] bg-background text-foreground border border-border/80 rounded-2xl shadow-2xl p-5 animate-in slide-in-from-bottom-5 duration-300">
      {!showPreferences ? (
        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
              <Shield className="size-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Cookie Consent</h4>
              <p className="text-xs text-muted-foreground leading-normal">
                We use cookies to optimize matchmaking speed, remember your preferences, and secure chat logs. Learn more in our{" "}
                <a href="/policies/cookies" className="text-primary  font-medium">
                  Cookie Policy
                </a>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => setShowPreferences(true)}
              className="text-xs font-semibold h-9 px-3 rounded-xl border border-border bg-transparent hover:bg-muted cursor-pointer"
            >
              Preferences
            </Button>
            <Button
              variant="outline"
              onClick={handleRejectAll}
              className="text-xs font-semibold h-9 px-3 rounded-xl border border-border bg-transparent hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Reject Non-Essential
            </Button>
            <Button
              onClick={handleAcceptAll}
              className="text-xs font-semibold h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
            >
              Accept All
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-sm font-semibold">Cookie Settings</h4>
            <button
              onClick={() => setShowPreferences(false)}
              className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Essential */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  Essential Cookies
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">Required</span>
                </span>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Required for user sessions, security authentication, and active matchmaking queues.
                </p>
              </div>
              <div className="p-1 bg-muted rounded-full text-muted-foreground opacity-60">
                <Check className="size-4" />
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 pt-2 border-t border-border/50">
              <div className="space-y-0.5">
                <span className="text-xs font-medium">Analytics Cookies</span>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Helps us analyze queue wait times, platform traffic, and server response speeds.
                </p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 pt-2 border-t border-border/50">
              <div className="space-y-0.5">
                <span className="text-xs font-medium">Marketing Cookies</span>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Remembers matchmaking interests to suggest active chat channels.
                </p>
              </div>
              <Switch checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setShowPreferences(false)}
              className="text-xs font-semibold h-9 px-3 rounded-xl border border-border bg-transparent hover:bg-muted cursor-pointer"
            >
              Back
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="text-xs font-semibold h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
            >
              Save Choices
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
