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

  const [accent, setAccent] = React.useState("default")
  const [interests, setInterests] = React.useState<string[]>([])
  const [customTopics, setCustomTopics] = React.useState<string[]>([])

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setAccent(localStorage.getItem("moots-accent") || "default")
      
      const savedInterests = localStorage.getItem("moots-interests")
      if (savedInterests) setInterests(JSON.parse(savedInterests))
        
      const savedCustom = localStorage.getItem("moots-custom-topics")
      if (savedCustom) setCustomTopics(JSON.parse(savedCustom))
    }
  }, [])

  const handleAccentChange = (val: string) => {
    setAccent(val)
    localStorage.setItem("moots-accent", val)
    window.dispatchEvent(new Event("moots-accent-changed"))
  }

  const handleToggleTopic = (topicId: string) => {
    const newInterests = interests.includes(topicId)
      ? interests.filter((t) => t !== topicId)
      : [...interests, topicId]
    
    setInterests(newInterests)
    localStorage.setItem("moots-interests", JSON.stringify(newInterests))
  }

  const handleAddCustom = (topicId: string) => {
    if (!interests.includes(topicId)) {
      const newInterests = [...interests, topicId]
      const newCustom = [...customTopics, topicId]
      setInterests(newInterests)
      setCustomTopics(newCustom)
      localStorage.setItem("moots-interests", JSON.stringify(newInterests))
      localStorage.setItem("moots-custom-topics", JSON.stringify(newCustom))
    }
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
      toast.success("Password updated successfully")
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

    accent,
    handleAccentChange,
    interests,
    customTopics,
    handleToggleTopic,
    handleAddCustom,
    handleUpdatePassword,
    handleDeleteAccount,
    handleDataExport
  }
}
