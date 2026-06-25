"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Settings,
  Bell,
  Palette,
  Eye,
  Shield,
  User,
  HelpCircle,
  X,
  Globe,
  Ban,
  Download,
  History,
  Link as LinkIcon,
  Lock,
  Trash2,
  ChevronRight
} from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = "general" | "notifications" | "personalization" | "privacy" | "security" | "account" | "help";

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState<TabType>("general");
  
  // Account state
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Preferences state
  const [language, setLanguage] = React.useState("en");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [pushEnabled, setPushEnabled] = React.useState(false);
  const [accent, setAccent] = React.useState("default");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setAccent(localStorage.getItem("moots-accent") || "default");
    }
  }, [open]);

  const handleAccentChange = (val: string) => {
    setAccent(val);
    localStorage.setItem("moots-accent", val);
    window.dispatchEvent(new Event("moots-accent-changed"));
  };

  React.useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || "");
    }
  }, [session]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Please enter a new password");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
    }, 1000);
  };

  const handleDeleteAccount = () => {
    const confirmation = window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.");
    if (confirmation) {
      toast.success("Account deletion request initiated.");
    }
  };

  const handleDataExport = () => {
    toast.success("Data export initiated. You will receive an email shortly with your archive.");
  };

  const menuItems = [
    { id: "general", label: "General", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "personalization", label: "Personalization", icon: Palette },
    { id: "privacy", label: "Privacy", icon: Eye },
    { id: "security", label: "Security", icon: Shield },
    { id: "account", label: "Account", icon: User },
    { id: "help", label: "Help", icon: HelpCircle },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex! p-0! gap-0! max-w-3xl sm:max-w-3xl! w-full h-[600px] overflow-hidden rounded-3xl bg-background text-foreground border border-border select-none">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your account preferences, notifications, theme personalization, privacy, and security settings.
        </DialogDescription>
        {/* Left Side: Sidebar */}
        <div className="w-52 md:w-56 bg-muted/20 p-4 border-r border-border flex flex-col gap-2 relative shrink-0">
          {/* Close button at top-left matching screenshot style */}
          <div className="mb-4">
            <DialogClose asChild>
              <button className="h-8 w-8 rounded-lg bg-muted hover:bg-accent flex items-center justify-center cursor-pointer border border-border transition-colors text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </DialogClose>
          </div>

          {/* Navigation Links with identical sidebar design language */}
          <nav className="flex flex-col gap-1 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex h-9 items-center gap-3 px-3 rounded-lg text-sm font-normal cursor-pointer transition-all ${
                    isActive
                      ? "bg-accent text-accent-foreground font-medium shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4.5 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Selected Menu Content */}
        <div className="flex-1 bg-background flex flex-col min-w-0">
          {/* Header */}
          <div className="px-8 pt-6 pb-4 shrink-0">
            <h3 className="text-lg font-semibold capitalize">{activeTab}</h3>
            <div className="h-px bg-border mt-4" />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
            
            {/* ── GENERAL TAB ── */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">Preferred Language</Label>
                    <p className="text-xs text-muted-foreground">Default matchmaking language feed.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-muted-foreground" />
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-[120px] bg-muted border-border text-foreground hover:bg-accent cursor-pointer">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="hi">हिन्दी</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">Queue Speed Mode</Label>
                    <p className="text-xs text-muted-foreground">Optimize search speed vs interest match depth.</p>
                  </div>
                  <Select defaultValue="balanced">
                    <SelectTrigger className="w-[120px] bg-muted border-border text-foreground hover:bg-accent cursor-pointer">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="fast">Fast Match</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="precise">Deep Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">Sound Alerts</Label>
                    <p className="text-xs text-muted-foreground">Play audio cues on incoming chats and message counts.</p>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">Offline Push Alerts</Label>
                    <p className="text-xs text-muted-foreground">Send standard browser triggers when you are offline.</p>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                </div>
              </div>
            )}

            {/* ── PERSONALIZATION (Appearance) TAB ── */}
            {activeTab === "personalization" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">Appearance</Label>
                    <p className="text-xs text-muted-foreground">Toggle application display theme.</p>
                  </div>
                  <Select value={theme} onValueChange={(val) => setTheme(val)}>
                    <SelectTrigger className="w-[120px] bg-muted border-border text-foreground hover:bg-accent cursor-pointer">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">Accent color</Label>
                    <p className="text-xs text-muted-foreground">Color profile for headers and buttons.</p>
                  </div>
                  <Select value={accent} onValueChange={handleAccentChange}>
                    <SelectTrigger className="w-[140px] bg-muted border-border text-foreground hover:bg-accent cursor-pointer">
                      <SelectValue placeholder="Accent Color" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="default">Orange (Default)</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ── PRIVACY TAB ── */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">Blocked Contacts</Label>
                  <div className="flex flex-col items-center justify-center py-6 text-center border border-border rounded-xl bg-muted/20">
                    <Ban className="size-6 text-muted-foreground/40 mb-2" />
                    <span className="text-xs font-medium text-foreground/80">No Blocked Users</span>
                    <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
                      Users you block in chat will appear here.
                    </p>
                  </div>
                </div>

                <div className="py-4 border-t border-border space-y-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">Data Export & Portability</Label>
                    <p className="text-xs text-muted-foreground mb-3">Download a copy of your chat transcripts and account info.</p>
                  </div>
                  <Button onClick={handleDataExport} variant="outline" className="text-xs font-semibold h-9 gap-2 border-border text-foreground hover:bg-accent">
                    <Download className="size-3.5" /> Request Data Export
                  </Button>
                </div>
              </div>
            )}

            {/* ── SECURITY TAB ── */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">Active Sessions</Label>
                  <div className="flex gap-3 items-start border border-border p-3 rounded-xl bg-muted/20">
                    <History className="size-4.5 text-primary shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">Chrome on Windows (Current)</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">IP: 192.168.1.10 • Active now</span>
                    </div>
                  </div>
                </div>

                <div className="py-4 border-t border-border space-y-3">
                  <Label className="text-sm font-medium text-foreground">Connected Accounts</Label>
                  <div className="flex flex-col items-center justify-center py-6 text-center border border-border rounded-xl bg-muted/20">
                    <LinkIcon className="size-6 text-muted-foreground/40 mb-2" />
                    <span className="text-xs font-medium text-foreground/80">No connected social profiles</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-medium">Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    disabled
                    className="h-9 border-border bg-muted/30 text-xs text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-3 border-t border-border pt-4">
                  <Label className="text-sm font-medium text-foreground">Change Password</Label>
                  
                  <div className="space-y-1">
                    <Label htmlFor="sec-pass" className="text-xs text-muted-foreground">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="sec-pass"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-9 border-border bg-background text-xs text-foreground"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sec-conf-pass" className="text-xs text-muted-foreground">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="sec-conf-pass"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 h-9 border-border bg-background text-xs text-foreground"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="text-xs font-semibold h-9 px-4 mt-2" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>

                <div className="border-t border-border pt-4 space-y-2">
                  <Label className="text-sm font-medium text-destructive">Danger Zone</Label>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Permanently delete your profile and logs. This cannot be undone.
                  </p>
                  <Button onClick={handleDeleteAccount} variant="destructive" className="text-xs font-semibold h-9 gap-2">
                    <Trash2 className="size-3.5" /> Delete Account
                  </Button>
                </div>
              </div>
            )}

            {/* ── HELP TAB ── */}
            {activeTab === "help" && (
              <div className="space-y-4">
                {[
                  { label: "Help Center", href: "/help" },
                  { label: "Community Guidelines", href: "/safety" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                ].map((linkItem) => (
                  <a
                    key={linkItem.label}
                    href={linkItem.href}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 text-foreground hover:text-foreground transition-all text-xs"
                  >
                    <span>{linkItem.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground/60" />
                  </a>
                ))}
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
