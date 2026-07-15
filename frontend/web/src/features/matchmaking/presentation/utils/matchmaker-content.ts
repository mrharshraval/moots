import { POPULAR_TOPICS } from "../components/interest-selector"
import { MatchmakingStatus } from "../store/matchmaking-store"

export function formatInterestsString(interests: string[]): string {
  if (interests.length === 0) return "Random vibe"
  return interests
    .map((tag: string) => {
      const predefined = POPULAR_TOPICS.find((t: any) => t.id === tag)
      return predefined ? predefined.label : tag.charAt(0).toUpperCase() + tag.slice(1)
    })
    .join(" • ")
}

export function getTitle(status: MatchmakingStatus): string {
  if (status === "idle") return "Meet someone new"
  if (status === "searching") return "Finding a match"
  return "Match Found"
}

export function getSubtitle(status: MatchmakingStatus, elapsedSeconds: number, interests: string[]): string {
  if (status === "idle") return "Ready to start your next random pairing?"
  if (status === "searching") {
    return elapsedSeconds < 15 
      ? "Looking for a compatible conversation partner" 
      : "This is taking a little longer than usual"
  }
  return `Shared interests: ${formatInterestsString(interests)}`
}
