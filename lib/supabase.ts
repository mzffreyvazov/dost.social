// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getUserId } from './_libaction';

// ===========================================
// ADMIN CLIENT (Server-side only, bypasses RLS)
// ===========================================
// Use this for: 
// - Server actions that need elevated privileges
// - Background jobs
// - Admin operations
// ===========================================
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// ===========================================
// BROWSER CLIENT WITH CLERK AUTH (Respects RLS)
// ===========================================
// Use this for: 
// - All client-side operations
// - User-specific data fetching
// - Any operation where RLS should apply
// ===========================================
export async function createClerkSupabaseClient(
  getToken: () => Promise<string | null>
): Promise<SupabaseClient> {
  const token = await getToken();

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
  );
}

// ===========================================
// ANONYMOUS CLIENT (Public data only)
// ===========================================
// Use this for:
// - Unauthenticated users viewing public data
// - Public pages before sign-in
// ===========================================
export const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Define a more specific error type
interface RetryableError extends Error {
  code?: string;
  message: string;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      // Type assertion to treat error as RetryableError
      if ((error as RetryableError).code === 'ECONNRESET') {
        console.log(`Retry attempt ${i + 1} after connection reset`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
}

// For client components only
export const createBrowserClient = () => {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: true },
      global: {
        fetch: async (url, options) => {
          return withRetry(() => fetch(url, {
            ...options,
            // Add retry and timeout options
            signal: AbortSignal.timeout(10000), // 10 second timeout
          }));
        },
      },
    }
  );
  return client;
};

// Fetching interests from tags table
interface Interest {
  id: string;
  label: string;
}

export async function fetchInterests(): Promise<Interest[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching interests:', error);
    return [];
  }

  return data.map(interest => ({
    id: interest.id.toString(),
    label: interest.name
  }));
}

// Community creation
export interface CommunityCreateData {
  name: string;
  description: string;
  owner_id: number;
  city?: string;
  country?: string;
  cover_image_url?: string;
  is_online?: boolean;
}

export interface ChatRoomCreateData {
  community_id: number;
  name: string;
  type: 'text' | 'voice' | 'video';
}

export interface CommunityTagCreateData {
  community_id: number;
  tag_id: number;  // Changed from tag_name to tag_id
}

// Define types for database responses
interface Community {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  owner_id: number;
  city: string | null;
  country: string | null;
  cover_image_url: string | null;
  is_online: boolean;
  member_count: number;
}

interface ChatRoom {
  id: number;
  community_id: number;
  name: string;
  type: 'text' | 'voice' | 'video';
  created_at: string;
}

interface CommunityTag {
  id: number;
  community_id: number;
  tag_id: number;
}

// Define error type
interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Creates a new community in the database
 */
export async function createCommunity(communityData: CommunityCreateData): Promise<{ data: Community | null; error: SupabaseError | null }> {
  const supabase = createBrowserClient();
  
  // Create a new timestamp for created_at and updated_at
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('communities')
    .insert([
      {
        name: communityData.name,
        description: communityData.description,
        created_at: now,
        updated_at: now,
        owner_id: communityData.owner_id,
        city: communityData.city || null,
        country: communityData.country || null,
        cover_image_url: communityData.cover_image_url || null,
        is_online: communityData.is_online || false,
        member_count: 1, // Start with the owner as the first member
      }
    ])
    .select()
    .single();
  
  return { data, error };
}

/**
 * Creates chat rooms for a community
 */
export async function createChatRooms(chatRooms: ChatRoomCreateData[]): Promise<{ data: ChatRoom[] | null; error: SupabaseError | null }> {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert(chatRooms)
    .select();
  
  return { data, error };
}

/**
 * Creates tags for a community
 */
export async function createCommunityTags(tagRelations: { community_id: number; tag_names: string[] }): Promise<{ data: CommunityTag[] | null; error: SupabaseError | null }> {
  const supabase = createBrowserClient();
  const { community_id, tag_names } = tagRelations;
  
  console.log("Creating tags for community:", community_id, "Tags:", tag_names);

  // First ensure all tags exist in the tags table
  const tagNames = [...new Set(tag_names)];
  
  // Check which tags already exist
  const { data: existingTags } = await supabase
    .from('tags')
    .select('id, name')
    .in('name', tagNames);
  
  const existingTagMap = new Map();
  existingTags?.forEach(tag => {
    existingTagMap.set(tag.name, tag.id);
  });
  
  const newTagNames = tagNames.filter(name => !existingTagMap.has(name));
  
  // Create new tags if needed
  if (newTagNames.length > 0) {
    const { data: newTags, error: createError } = await supabase
      .from('tags')
      .insert(newTagNames.map(name => ({ name })))
      .select('id, name');
    
    if (createError) {
      return { data: null, error: createError };
    }
    
    // Add new tags to the map
    newTags?.forEach(tag => {
      existingTagMap.set(tag.name, tag.id);
    });
  }
  
  // Now create the community-tag relationships with proper tag_id values
  const tagRelationsToInsert = tagNames.map(tagName => ({
    community_id,
    tag_id: existingTagMap.get(tagName)
  }));
  
  const { data, error } = await supabase
    .from('community_tags')
    .insert(tagRelationsToInsert)
    .select();
  
  return { data, error };
}

/**
 * Creates a community with its chat rooms and tags
 */
export async function createFullCommunity(
  
  communityData: CommunityCreateData,
  chatRooms: Array<{ name: string; type: 'text' | 'voice' | 'video' }>,
  tags: string[]
): Promise<{ success: boolean; communityId?: number; error?: SupabaseError | Error }> {
  try {
    // 1. Create the community
    const supabase = createBrowserClient();
    const { data: community, error: communityError } = await createCommunity(communityData);
    
    if (communityError) throw communityError;
    if (!community) throw new Error('Failed to create community: No data returned');
    
    const communityId = community.id;
    
    // 2. Create the chat rooms
    const chatRoomsData = chatRooms.map(room => ({
      community_id: communityId,
      name: room.name,
      type: room.type
    }));
    
    const { error: chatRoomsError } = await createChatRooms(chatRoomsData);
    
    if (chatRoomsError) throw chatRoomsError;
    
    // 3. Create the tags
    if (tags.length > 0) {
      const { error: tagsError } = await createCommunityTags({
        community_id: communityId,
        tag_names: tags
      });
      
      if (tagsError) throw tagsError;
    }
    
    // 4. Create membership for the owner
    const { error: membershipError } = await supabase
      .from('community_members')
      .insert([
        {
          community_id: communityId,
          user_id: communityData.owner_id,
          role: 'owner',
          joined_at: new Date().toISOString()
        }
      ]);
    
    if (membershipError) throw membershipError;
    
    return { success: true, communityId };
  } catch (error) {
    console.error('Error creating community:', error);
    return { success: false, error: error as SupabaseError | Error };
  }
}

/**
 * Uploads an image file to Supabase storage
 */
export async function uploadCommunityImage(file: File, userId: number): Promise<{ url: string | null; error: SupabaseError | null }> {
  const supabase = createBrowserClient();
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `community_images/${fileName}`;
  
  const { error } = await supabase.storage
    .from('community-images')
    .upload(filePath, file);
  
  if (error) {
    return { url: null, error };
  }
  
  const { data } = supabase.storage
    .from('community-images')
    .getPublicUrl(filePath);
  
  return { url: data.publicUrl, error: null };
}

/**
 * This is a client-safe wrapper around the server action
 */
export async function getCurrentUserId(): Promise<number | null> {
  return getUserId();
}

export interface Event {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  location: string
  is_online: boolean
  max_attendees: number
  address: string
  created_by: number
  created_by_user: {
    useri_id: number
    profile_image_url: string
  }
}

export async function getEventWithDetails(eventId: string) {
  const supabase = createAdminClient()
  
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      created_by_user:created_by(*)
    `)
    .eq('id', eventId)
    .single()

  if (eventError) {
    console.error('Error fetching event:', eventError)
    return null
  }

  const { data: attendees, error: attendeesError } = await supabase
    .from('event_attendees')
    .select(`
      user_id,
      user:user_id(*)
    `)
    .eq('event_id', eventId)

  if (attendeesError) {
    console.error('Error fetching attendees:', attendeesError)
    return null
  }

  return {
    ...event,
    attendees: attendees?.map(a => a.user) || []
  }
}


