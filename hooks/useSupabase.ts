import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Hook to get a Supabase client with Clerk authentication
 * 
 * For authenticated users, returns a client with the Clerk JWT token
 * which enables RLS policies to identify the user via clerk_user_id()
 * 
 * For unauthenticated users, returns an anonymous client that can only
 * access public data as defined by RLS policies
 */
export function useSupabase() {
  const { getToken, isSignedIn } = useAuth()

  const getSupabaseClient = useCallback(async (): Promise<SupabaseClient> => {
    if (!isSignedIn) {
      // Return anonymous client for unauthenticated users
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }

    // Get the Clerk token - works with native Clerk-Supabase integration
    const token = await getToken()

    return createClient(
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
  }, [getToken, isSignedIn])

  return { getSupabaseClient, isSignedIn }
}
