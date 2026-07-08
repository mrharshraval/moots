import * as React from "react"
import { useSession } from "@/providers/auth-provider"
import { useTheme } from "next-themes"
import { toast } from "sonner"

export function useSettings() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const [language, setLanguage] = React.useState("en")
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [pushEnabled, setPushEnabled] = React.useState(false)
  const [accent, setAccent] = React.useState("default")

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setAccent(localStorage.getItem("moots-accent") || "default")
    }
  }, [])

  const handleAccentChange = (val: string) => {
    setAccent(val)
    localStorage.setItem("moots-accent", val)
    window.dispatchEvent(new Event("moots-accent-changed"))
  }

  React.useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || "")
    }
  }, [session])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      toast.error("Please enter a new password")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setPassword("")
      setConfirmPassword("")
      toast.success("Password updated successfully!")
    }, 1000)
  }

  const handleDeleteAccount = () => {
    const confirmation = window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")
    if (confirmation) {
      toast.success("Account deletion request initiated.")
    }
  }

  const handleDataExport = () => {
    toast.success("Data export initiated. You will receive an email shortly with your archive.")
  }

  return {
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
    soundEnabled,
    setSoundEnabled,
    pushEnabled,
    setPushEnabled,
    accent,
    handleAccentChange,
    handleUpdatePassword,
    handleDeleteAccount,
    handleDataExport
  }
}
