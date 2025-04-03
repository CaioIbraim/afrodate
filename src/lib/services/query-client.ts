import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Custom error handler
queryClient.setDefaultOptions({
  mutations: {
    onError: (error) => {
      console.error('Mutation error:', error)
      // Implement global error handling (e.g., show toast notification)
    },
  },
})

// Add global cache listeners
queryClient.getQueryCache().subscribe({
  onError: (error) => {
    console.error('Cache error:', error)
    // Implement global cache error handling
  },
})

// Add performance monitoring
queryClient.getMutationCache().subscribe({
  onSuccess: () => {
    // Track successful mutations for analytics
  },
  onError: (error) => {
    // Track failed mutations for analytics
  },
})