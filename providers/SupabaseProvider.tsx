'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

type SupabaseContextType = {
  supabase: SupabaseClient | null
  isLoading: boolean
  refreshClient: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  isLoading: true,
  refreshClient: async () => {},
})

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const initSupabase = useCallback(async () => {
    if (!isLoaded) return

    let client: SupabaseClient

    if (isSignedIn) {
      // Get the Clerk token - works with native Clerk-Supabase integration
      const token = await getToken()
      client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      )
    } else {
      // Anonymous client for unauthenticated users
      client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }

    setSupabase(client)
    setIsLoading(false)
  }, [getToken, isSignedIn, isLoaded])

  useEffect(() => {
    initSupabase()
  }, [initSupabase])

  // Re-initialize when auth state changes
  useEffect(() => {
    if (isLoaded) {
      initSupabase()
    }
  }, [isSignedIn, isLoaded, initSupabase])

  const refreshClient = useCallback(async () => {
    setIsLoading(true)
    await initSupabase()
  }, [initSupabase])

  return (
    <SupabaseContext.Provider value={{ supabase, isLoading, refreshClient }}>
      {children}
    </SupabaseContext.Provider>
  )
}

/**
 * Hook to access the Supabase client from the provider
 * 
 * Returns:
 * - supabase: The Supabase client (null while loading)
 * - isLoading: Whether the client is being initialized
 * - refreshClient: Function to refresh the client (useful after auth changes)
 */
export function useSupabaseClient() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabaseClient must be used within SupabaseProvider')
  }
  return context
}
