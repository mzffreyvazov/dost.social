'use server'

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
// app/onboarding/_actions.ts
export async function completeOnboarding(formData: FormData) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return { error: "Unauthorized" };
    }

    const bio = formData.get('bio') as string;
    const interestsString = formData.get('interests') as string;
    const interests = interestsString ? JSON.parse(interestsString) : [];
    const profilePhoto = formData.get('profilePhoto') as File | null;
    const client = await clerkClient();
    const token = await getToken();
    
    // Upload profile image to Clerk if provided
    if (profilePhoto && profilePhoto.size > 0) {
      try {
        await client.users.updateUserProfileImage(userId, {
          file: profilePhoto
        });
      } catch (imageError) {
        console.error('Failed to upload profile image to Clerk:', imageError);
        // Don't fail the entire onboarding if image upload fails
      }
    }
    
    // Update user metadata with bio and interests in Clerk
    await client.users.updateUser(userId, {
      unsafeMetadata: {
        bio,
      },
      publicMetadata: {
        onboardingBioComplete: true,
        interests: interests // Store interests in Clerk metadata
      }
    });

    // Update Supabase profile
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ bio }),
    });

    if (!response.ok) {
      throw new Error('Failed to update bio in Supabase');
    }

    // Update user tags in Supabase
    const supabase = createAdminClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('useri_id')  // Using useri_id as specified
      .eq('clerk_user_id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('User lookup error:', userError);
      throw new Error('Failed to find user in database');
    }
    
    const numericUserId = userData.useri_id;
    
    // Then insert new user tags
    if (interests && interests.length > 0) {
      const userTags = interests.map((tagId: string) => ({
        user_id: numericUserId,
        tag_id: parseInt(tagId)
      }));

      console.log('Inserting tags:', userTags);

      const { error: tagError } = await supabase
        .from('user_tags')
        .insert(userTags);

      if (tagError) {
        console.error('Tag insert error:', tagError);
        throw new Error(`Failed to insert tags: ${tagError.message}`);
      }
    }

    return { message: "Profile updated successfully" };
  } catch (error) {
    console.error("Onboarding error:", error);
    return { 
      error: error instanceof Error ? error.message : "Failed to complete onboarding" 
    };
  }
}

// app/onboarding/_actions.ts - Add this function
// app/onboarding/_actions.ts - completeLocationOnboarding function
export async function completeLocationOnboarding(formData: FormData) {
    try {
      const { userId, getToken } = await auth();
      if (!userId) {
        return { error: "Unauthorized" };
      }
  
      // Get location data from form
      const city = formData.get('city') as string;
      const country = formData.get('country') as string;
      const latitude = formData.get('latitude') as string;
      const longitude = formData.get('longitude') as string;
  
      // Validate required fields
      if (!city || !country) {
        return { error: "City and country are required" };
      }
  
      const client = await clerkClient();
      const token = await getToken();
  
      // Update user metadata in Clerk - now marking the ENTIRE onboarding as complete
      await client.users.updateUser(userId, {
        publicMetadata: {
          onboardingComplete: true,
          location: {
            city,
            country
          }
        }
      });
  
      // Update Supabase using the API route
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          city, 
          country, 
          latitude: latitude || null, 
          longitude: longitude || null 
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update location in Supabase');
      }
  
      return { message: "Location updated successfully" };
    } catch (error) {
      console.error("Location update error:", error);
      return { error: "Failed to update location" };
    }
  }