import { useState, useEffect } from "react"

export function useElapsedTime(startedAt: number | null): number {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!startedAt) {
      setSeconds(0)
      return
    }

    const updateTimer = () => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return seconds
}
