"use client"

import * as React from "react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Switch } from "@/shared/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/shared/ui/card"
import { Label } from "@/shared/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs"
import {
  Settings,
  User,
  Shield,
  Palette,
  Eye,
  Trash2,
  Lock,
  Globe,
  Bell,
  Ban,
  Download,
  History,
  Link as LinkIcon
} from "lucide-react"

import { InterestSelector } from "@/features/matchmaking"
import { useSettings } from "../hooks/use-settings"

export function SettingsPanel() {
  const {
    theme,
    setTheme,
    email,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    language,
    setLanguage,

    accent,
    handleAccentChange,
    interests,
    customTopics,
    handleToggleTopic,
    handleAddCustom,
    handleUpdatePassword,
    handleDeleteAccount,
    handleDataExport
  } = useSettings()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-foreground" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
      </div>

      <Tabs defaultValue="account" className="w-full flex flex-col md:flex-row gap-6">
        <TabsList className="flex md:flex-col items-stretch md:w-48 h-auto bg-muted/40 p-1 rounded-xl md:justify-start gap-1 shrink-0">
          <TabsTrigger value="account" className="justify-start gap-2 h-9 text-xs font-semibold px-3 data-[state=active]:bg-card">
            <User className="size-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="preferences" className="justify-start gap-2 h-9 text-xs font-semibold px-3 data-[state=active]:bg-card">
            <Palette className="size-4" /> Preferences
          </TabsTrigger>
          <TabsTrigger value="privacy" className="justify-start gap-2 h-9 text-xs font-semibold px-3 data-[state=active]:bg-card">
            <Eye className="size-4" /> Privacy
          </TabsTrigger>
          <TabsTrigger value="security" className="justify-start gap-2 h-9 text-xs font-semibold px-3 data-[state=active]:bg-card">
            <Shield className="size-4" /> Security
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          {/* ── ACCOUNT TAB ── */}
          <TabsContent value="account" className="mt-0 space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Account Information</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  View your account email address details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="h-10 border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Change Password</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Update your security credentials.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="pass" className="text-xs font-semibold text-foreground">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="pass"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-10 border-border bg-background text-sm text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="conf-pass" className="text-xs font-semibold text-foreground">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="conf-pass"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 h-10 border-border bg-background text-sm text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="text-xs font-semibold h-10 px-6" disabled={loading}>
                    {loading ? "Updating" : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-destructive">Danger Zone</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Permanently delete your account and all associated transcripts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Once deleted, your account cannot be recovered. All friend connections and message logs will be immediately wiped.
                </p>
                <Button onClick={handleDeleteAccount} variant="destructive" className="text-xs font-semibold h-10 gap-2">
                  <Trash2 className="size-4" /> Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PREFERENCES TAB ── */}
          <TabsContent value="preferences" className="mt-0 space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Matchmaking Interests</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Choose your preferred topics. These will be used automatically when you start matching.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterestSelector
                  selected={interests}
                  customTopics={customTopics}
                  onToggle={handleToggleTopic}
                  onAddCustom={handleAddCustom}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">App Preferences</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Configure display details and notifications alerts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-foreground">Theme Mode</Label>
                    <p className="text-[10px] text-muted-foreground">Toggle color palette</p>
                  </div>
                  <div className="flex gap-1.5 bg-muted/40 p-1 rounded-lg">
                    {["light", "dark"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                          theme === t ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t === "light" ? "Light" : "Dark"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-foreground">Preferred Language</Label>
                    <p className="text-[10px] text-muted-foreground">Default matching language</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-background border border-border text-xs rounded-lg p-1.5 focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="hi">हिन्दी</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PRIVACY TAB ── */}
          <TabsContent value="privacy" className="mt-0 space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Blocked Users</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Manage contacts you have muted or blocked.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Ban className="size-5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">No Blocked Users</h4>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Users you block during chat matches will appear here.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Data Export & Portability</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Request a download of all your stored data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Under GDPR/privacy compliance, you can export a JSON archive containing your chat session history, profile metadata, and contacts list.
                </p>
                <Button onClick={handleDataExport} variant="outline" className="text-xs font-semibold h-10 gap-2">
                  <Download className="size-4" /> Request Data Export
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SECURITY TAB ── */}
          <TabsContent value="security" className="mt-0 space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Active Sessions</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Devices currently logged in to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <History className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">Chrome on Windows (Current)</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">IP: 192.168.1.10 • Active now</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Connected Accounts</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Social login providers connected to your profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <LinkIcon className="size-5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">No Accounts Connected</h4>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Connect third-party accounts (Google, GitHub) for quick login.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
