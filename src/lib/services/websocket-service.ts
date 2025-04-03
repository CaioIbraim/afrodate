import { ProfileData, MatchResult } from "../types"

export class WebSocketService {
  private static instance: WebSocketService
  private socket: WebSocket | null = null
  private messageQueue: any[] = []
  private reconnectAttempts = 0
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private readonly RECONNECT_DELAY = 1000 // 1 second
  private readonly MAX_MESSAGE_QUEUE = 100
  private readonly RATE_LIMIT_WINDOW = 60000 // 1 minute
  private readonly MAX_MESSAGES_PER_WINDOW = 100
  private messageCount = 0
  private windowStart = Date.now()

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  public connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url)

        this.socket.onopen = () => {
          this.reconnectAttempts = 0
          this.processMessageQueue()
          resolve()
        }

        this.socket.onclose = () => {
          this.handleDisconnect()
        }

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        console.error('Failed to connect:', error)
        reject(error)
      }
    })
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect(this.socket?.url || '')
      }, this.RECONNECT_DELAY * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  private async handleMessage(data: any) {
    try {
      const message = JSON.parse(data)
      switch (message.type) {
        case 'match':
          this.handleMatchUpdate(message.data)
          break
        case 'message':
          this.handleChatMessage(message.data)
          break
        case 'notification':
          this.handleNotification(message.data)
          break
        default:
          console.warn('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }

  private handleMatchUpdate(data: { profile: ProfileData; result: MatchResult }) {
    // Implement match update logic
    console.log('Match update:', data)
  }

  private handleChatMessage(data: { from: string; content: string; timestamp: number }) {
    // Implement chat message logic
    console.log('Chat message:', data)
  }

  private handleNotification(data: { type: string; message: string }) {
    // Implement notification logic
    console.log('Notification:', data)
  }

  public send(data: any): void {
    if (!this.checkRateLimit()) {
      console.warn('Rate limit exceeded')
      return
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
      this.messageCount++
    } else {
      if (this.messageQueue.length < this.MAX_MESSAGE_QUEUE) {
        this.messageQueue.push(data)
      } else {
        console.warn('Message queue full')
      }
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const data = this.messageQueue.shift()
      if (data && this.checkRateLimit()) {
        this.socket.send(JSON.stringify(data))
        this.messageCount++
      }
    }
  }

  private checkRateLimit(): boolean {
    const now = Date.now()
    if (now - this.windowStart >= this.RATE_LIMIT_WINDOW) {
      this.windowStart = now
      this.messageCount = 0
      return true
    }
    return this.messageCount < this.MAX_MESSAGES_PER_WINDOW
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }
}