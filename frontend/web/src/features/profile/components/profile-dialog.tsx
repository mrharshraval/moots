"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/shared/ui/dialog"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Camera } from "lucide-react"
import { useProfile } from "../hooks/use-profile"

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const {
    user,
    name,
    setName,
    username,
    setUsername,
    image,
    loading,
    handleFileChange,
    handleSaveProfile,
  } = useProfile(() => onOpenChange(false))

  if (!user) return null

  const initials = (name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="grid! p-8! gap-6! max-w-[420px] sm:max-w-[420px]! w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] rounded-3xl bg-background text-foreground border border-border select-none">
        <DialogTitle className="text-xl font-semibold mb-6">Edit profile</DialogTitle>
        <DialogDescription className="sr-only">
          Update your display name, username, bio, and avatar.
        </DialogDescription>

        <form onSubmit={(e) => handleSaveProfile(e, "ProfileDialog Save Profile")} className="space-y-6">
          {/* Circular Avatar with Camera overlay */}
          <div className="flex justify-center relative">
            <div className="relative group size-32">
              <Avatar className="size-full border-2 border-border rounded-full shadow-lg">
                {image ? (
                  <AvatarImage src={image} alt={name || "User"} className="object-cover" />
                ) : (
                  <AvatarFallback className="text-4xl font-bold bg-muted text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <label
                htmlFor="modal-avatar-upload"
                className="absolute bottom-1 right-1 size-8 bg-muted hover:bg-accent rounded-full flex items-center justify-center cursor-pointer border border-border transition-colors text-muted-foreground hover:text-foreground"
              >
                <Camera className="size-4" />
              </label>
              <input
                id="modal-avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Form Fields matching the screenshot */}
          <div className="space-y-4">
            <div className="relative border border-border rounded-xl px-3 py-2 bg-muted/20 focus-within:ring-1 focus-within:ring-border/40">
              <Label htmlFor="modal-name" className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                Display name
              </Label>
              <Input
                id="modal-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-none p-0 h-6 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-hidden"
              />
            </div>

            <div className="relative border border-border rounded-xl px-3 py-2 bg-muted/20 focus-within:ring-1 focus-within:ring-border/40">
              <Label htmlFor="modal-username" className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                Username
              </Label>
              <Input
                id="modal-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full bg-transparent border-none p-0 h-6 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-hidden"
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center px-4 leading-normal">
            Your profile helps people recognize you in group chats.
          </p>

          {/* Action Buttons matching the screenshot */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 rounded-full border border-border text-xs font-semibold text-foreground bg-transparent hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
            >
              {loading ? "Saving" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
