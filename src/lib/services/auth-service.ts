import { UserProfile } from "../types"

interface AuthResponse {
  token: string
  user: UserProfile
}

interface AuthError extends Error {
  code?: string
  status?: number
}

export class AuthService {
  private static instance: AuthService
  private static readonly AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000/api/auth'
  private token: string | null = null

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  public getToken(): string | null {
    return this.token
  }

  private setToken(token: string): void {
    this.token = token
    try {
      localStorage.setItem('auth_token', token)
    } catch (error) {
      console.error("Failed to store token in localStorage:", error)
    }
  }

  private clearToken(): void {
    this.token = null
    try {
      localStorage.removeItem('auth_token')
    } catch (error) {
      console.error("Failed to remove token from localStorage:", error)
    }
  }

  public async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${AuthService.AUTH_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error: AuthError = new Error('Authentication failed')
        error.status = response.status
        throw error
      }

      const data = await response.json()
      this.setToken(data.token)
      return data
    } catch (error) {
      console.error("Login error:", error)
      throw new Error(
        `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  public static async loginWithProvider(provider: "google" | "facebook", options?: Record<string, any>): Promise<AuthResponse> {
    try {
      const response = await fetch(`${AuthService.AUTH_URL}/oauth/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        const error: AuthError = new Error('OAuth login failed')
        error.status = response.status
        throw error
      }

      const data = await response.json()
      AuthService.getInstance().setToken(data.token)
      return data
    } catch (error) {
      console.error("Error in loginWithProvider:", error)
      throw new Error(
        `OAuth login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  public async register(userData: {
    email: string
    password: string
    name: string
    age: number
    gender: string
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${AuthService.AUTH_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const error: AuthError = new Error('Registration failed')
        error.status = response.status
        throw error
      }

      const data = await response.json()
      this.setToken(data.token)
      return data
    } catch (error) {
      console.error("Registration error:", error)
      throw new Error(
        `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  public async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${AuthService.AUTH_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      this.clearToken()
    }
  }

  public async verifyToken(): Promise<boolean> {
    if (!this.token) return false

    try {
      const response = await fetch(`${AuthService.AUTH_URL}/verify`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      })

      return response.ok
    } catch (error) {
      console.error("Token verification error:", error)
      return false
    }
  }

  public async refreshToken(): Promise<void> {
    try {
      const response = await fetch(`${AuthService.AUTH_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      })

      if (!response.ok) throw new Error('Token refresh failed')

      const { token } = await response.json()
      this.setToken(token)
    } catch (error) {
      console.error("Token refresh error:", error)
      this.clearToken()
      throw error
    }
  }
}