import { useEffect } from "react"
import { WebSocketService } from "@/lib/services/websocket-service"

const websocketService = WebSocketService.getInstance()

export function useWebSocket(userId: string) {
  useEffect(() => {
    websocketService.connect(userId)

    return () => {
      websocketService.disconnect()
    }
  }, [userId])

  return {
    sendMessage: websocketService.sendMessage.bind(websocketService),
    subscribe: websocketService.subscribe.bind(websocketService),
    unsubscribe: websocketService.unsubscribe.bind(websocketService),
  }
}