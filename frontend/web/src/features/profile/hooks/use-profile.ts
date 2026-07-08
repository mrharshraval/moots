import * as React from "react"
import { env } from "@/env";
import { useSession } from "@/providers/auth-provider"
import { toast } from "sonner"
import { apiRequest } from "@/infrastructure/http/api-client"

export function useProfile(onSuccess?: () => void) {
  const { data: session, update } = useSession()
  const [name, setName] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [image, setImage] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "")
      setUsername((session.user as any).username || "")
      setBio((session.user as any).bio || "")
      setImage(session.user.image || "")
    }
  }, [session])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        toast.error("File size must be less than 2MB")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent, actionName: string = "Save Profile") => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/user/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, bio, image }),
        actionName,
        userId: session?.user?.id,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to update profile")
        return
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
      })

      toast.success("Profile updated successfully!")
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while saving profile")
    } finally {
      setLoading(false)
    }
  }

  return {
    session,
    user: session?.user,
    name,
    setName,
    username,
    setUsername,
    bio,
    setBio,
    image,
    setImage,
    loading,
    handleFileChange,
    handleSaveProfile,
  }
}
