import { format, isToday, isYesterday, isThisYear, parseISO, differenceInHours, isSameDay } from "date-fns"

export function formatMessageTime(isoString: string): string {
  try {
    const date = parseISO(isoString)
    if (isToday(date)) {
      return `Today ${format(date, "h:mm a")}`
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`
    } else if (isThisYear(date)) {
      return format(date, "d MMM h:mm a")
    } else {
      return format(date, "d MMM yyyy h:mm a")
    }
  } catch (err) {
    return isoString
  }
}

export function shouldShowDateSeparator(prevIso: string | undefined, currentIso: string): boolean {
  if (!prevIso) return true; // Always show for the very first message
  try {
    const prevDate = parseISO(prevIso)
    const currDate = parseISO(currentIso)
    // Show separator if messages are on different days or > 1 hour apart
    return !isSameDay(prevDate, currDate) || Math.abs(differenceInHours(currDate, prevDate)) >= 1
  } catch {
    return false
  }
}

export function formatDateSeparator(isoString: string): string {
  try {
    const date = parseISO(isoString)
    if (isToday(date)) {
      return `Today ${format(date, "h:mm a")}`
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`
    } else if (isThisYear(date)) {
      return format(date, "d MMM h:mm a")
    } else {
      return format(date, "d MMM yyyy h:mm a")
    }
  } catch {
    return isoString
  }
}
