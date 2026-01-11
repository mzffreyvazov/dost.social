import { useAuth } from '@clerk/nextjs'
import { useCallback, useRef } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton for anonymous client
let anonClient: SupabaseClient | null = null;

function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return anonClient;
}

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
  // Cache the authenticated client with its token
  const cachedClientRef = useRef<{ client: SupabaseClient; token: string } | null>(null);

  const getSupabaseClient = useCallback(async (): Promise<SupabaseClient> => {
    if (!isSignedIn) {
      // Return singleton anonymous client for unauthenticated users
      return getAnonClient();
    }

    // Get the Clerk token - works with native Clerk-Supabase integration
    const token = await getToken()
    
    if (!token) {
      return getAnonClient();
    }

    // Return cached client if token hasn't changed
    if (cachedClientRef.current && cachedClientRef.current.token === token) {
      return cachedClientRef.current.client;
    }

    // Create new client with updated token
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Cache for reuse
    cachedClientRef.current = { client, token };

    return client;
  }, [getToken, isSignedIn])

  return { getSupabaseClient, isSignedIn }
}
