"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { data: session, update } = useSession();
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [image, setImage] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setUsername((session.user as any).username || "");
      setBio((session.user as any).bio || "");
      setImage(session.user.image || "");
    }
  }, [session, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        toast.error("File size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiRequest("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, bio, image }),
        actionName: "ProfileDialog Save Profile",
        userId: session?.user?.id,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
        return;
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          name,
          username,
          bio,
          image,
        },
      });

      toast.success("Profile updated successfully!");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving profile");
    } finally {
      setLoading(false);
    }
  };

  const user = session?.user;
  if (!user) return null;

  const initials = (name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="grid! p-8! gap-6! max-w-[420px] sm:max-w-[420px]! w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] rounded-3xl bg-background text-foreground border border-border select-none">
        <DialogTitle className="text-xl font-semibold mb-6">Edit profile</DialogTitle>
        <DialogDescription className="sr-only">
          Update your display name, username, bio, and avatar.
        </DialogDescription>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Circular Avatar with Camera overlay */}
          <div className="flex justify-center relative">
            <div className="relative group size-32">
              <Avatar className="size-full border-2 border-border rounded-full shadow-lg">
                {image ? (
                  <AvatarImage src={image} alt={name || "User"} className="object-cover" />
                ) : (
                  <AvatarFallback className="text-4xl font-bold bg-[#d95f02] text-white">
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
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
