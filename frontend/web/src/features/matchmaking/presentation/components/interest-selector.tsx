import { useState } from "react"
import { Plus } from "lucide-react"
import { Input } from "@/shared/ui/input"

export const POPULAR_TOPICS = [
  { id: "gaming", label: "Gaming" },
  { id: "movies", label: "Movies" },
  { id: "music", label: "Music" },
  { id: "sports", label: "Sports" },
  { id: "technology", label: "Technology" },
  { id: "food", label: "Food" },
  { id: "travel", label: "Travel" },
  { id: "books", label: "Books" },
  { id: "art", label: "Art" },
]

interface InterestSelectorProps {
  selected: string[]
  customTopics: string[]
  onToggle: (topicId: string) => void
  onAddCustom: (topicId: string) => void
}

export function InterestSelector({ selected, customTopics, onToggle, onAddCustom }: InterestSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState("")

  const allTopics = [
    ...POPULAR_TOPICS,
    ...customTopics.map((topic) => ({
      id: topic,
      label: topic.charAt(0).toUpperCase() + topic.slice(1),
    })),
  ]

  const handleCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanTag = customInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    if (cleanTag && !selected.includes(cleanTag)) {
      onAddCustom(cleanTag)
    }
    setCustomInput("")
    setShowCustomInput(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCustomSubmit()
    } else if (e.key === "Escape") {
      setCustomInput("")
      setShowCustomInput(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-[560px]">
        {allTopics.map((topic) => {
          const isSelected = selected.includes(topic.id)
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => onToggle(topic.id)}
              className={`text-[13px] h-[32px] px-5 rounded-full font-medium border flex items-center justify-center transition-colors cursor-pointer ${
                isSelected
                  ? "bg-foreground border-foreground text-background hover:bg-foreground/90"
                  : "bg-background border-border/80 text-foreground hover:bg-muted/50"
              }`}
            >
              {topic.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center min-h-[40px]">
        {showCustomInput ? (
          <div className="w-full max-w-[200px] animate-in fade-in duration-200">
            <Input
              autoFocus
              placeholder="Type custom topic"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCustomSubmit}
              className="text-xs h-[32px] rounded-full bg-background border-border w-full px-4"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer font-medium h-[40px] px-2 border-0 bg-transparent"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Add custom topic
          </button>
        )}
      </div>
    </div>
  )
}
