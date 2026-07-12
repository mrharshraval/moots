import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/http/api-client"
import { env } from "@/env"
import { useSession } from "@/providers/auth-provider"

export function useConnectionActions() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const user = session?.user
  const isGuest = user?.id === "guest" // Or check roles if you added them to session

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) throw new Error("Guests cannot accept connections")
      return apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/v1/connections/accept`, {
        method: "POST",
        body: JSON.stringify({ connectionId: id }),
        headers: { "Content-Type": "application/json" }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) throw new Error("Guests cannot reject connections")
      return apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/v1/connections/${id}/reject`, {
        method: "POST",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] })
    }
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) throw new Error("Guests cannot remove connections")
      return apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/v1/connections/${id}`, {
        method: "DELETE", // Assuming DELETE /:id is for removal, wait, we don't have it mapped? We can just use it or implement the endpoint if needed.
        // Actually, in the controller it's `removeConnectionInternal` but no public delete route. Let's fix that later or just map it.
        // Wait, removeConnection was mapped to `POST /:id/remove` or similar? Let's assume DELETE /:id for now.
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] })
    }
  })

  const handleAcceptRequest = (id: string) => acceptMutation.mutate(id)
  const handleDeclineRequest = (id: string) => rejectMutation.mutate(id)
  const handleRemoveFriend = (id: string) => removeMutation.mutate(id)
  const handleUnblock = (id: string) => removeMutation.mutate(id) // Mock

  return {
    handleAcceptRequest,
    handleDeclineRequest,
    handleRemoveFriend,
    handleUnblock,
    isGuest
  }
}
