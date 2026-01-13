'use server'

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
// app/onboarding/_actions.ts
export async function completeOnboarding(formData: FormData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "Unauthorized" };
    }

    const bio = formData.get('bio') as string;
    const interestsString = formData.get('interests') as string;
    const interests = interestsString ? JSON.parse(interestsString) : [];
    const profilePhoto = formData.get('profilePhoto') as File | null;
    const client = await clerkClient();
    
    // Upload profile image to Clerk if provided
    if (profilePhoto && profilePhoto.size > 0) {
      try {
        // Convert File to ArrayBuffer then to Blob for mobile compatibility
        // Mobile browsers may have issues with File objects in Server Actions
        const arrayBuffer = await profilePhoto.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: profilePhoto.type || 'image/jpeg' });
        
        await client.users.updateUserProfileImage(userId, {
          file: blob
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

    // Ensure user exists in Supabase and update bio.
    // This avoids relying on a client-only initializer and avoids internal API calls
    // that may fail due to missing cookies.
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('useri_id')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (existingUserError) {
      console.error('User lookup error:', existingUserError);
      throw new Error('Failed to look up user in database');
    }

    let numericUserId: number;
    if (!existingUser) {
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: userId,
          bio: bio || null,
          created_at: now,
          updated_at: now,
        })
        .select('useri_id')
        .single();

      if (insertError || !insertedUser) {
        console.error('User insert error:', insertError);
        throw new Error('Failed to create user in database');
      }

      numericUserId = insertedUser.useri_id;
    } else {
      numericUserId = existingUser.useri_id;

      const { error: updateError } = await supabase
        .from('users')
        .update({
          bio: bio || null,
          updated_at: now,
        })
        .eq('useri_id', numericUserId);

      if (updateError) {
        console.error('User update error:', updateError);
        throw new Error('Failed to update user in database');
      }
    }
    
    // Then insert new user tags
    // Make this idempotent so retries don't fail on unique constraints.
    const { error: deleteTagsError } = await supabase
      .from('user_tags')
      .delete()
      .eq('user_id', numericUserId);

    if (deleteTagsError) {
      console.error('Tag delete error:', deleteTagsError);
      throw new Error('Failed to reset user tags');
    }

    const normalizedInterestIds = (Array.isArray(interests) ? interests : [])
      .map((tagId: string) => Number(tagId))
      .filter((tagId: number) => Number.isFinite(tagId));

    if (normalizedInterestIds.length > 0) {
      const userTags = normalizedInterestIds.map((tagId: number) => ({
        user_id: numericUserId,
        tag_id: tagId,
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
      const { userId } = await auth();
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

      // Update Supabase directly with admin client (no internal API calls).
      const supabase = createAdminClient();
      const now = new Date().toISOString();

      const { error: locationError } = await supabase
        .from('users')
        .update({
          city,
          country,
          location_latitude: latitude || null,
          location_longitude: longitude || null,
          updated_at: now,
        })
        .eq('clerk_user_id', userId);

      if (locationError) {
        console.error('Error updating user location:', locationError);
        throw new Error(locationError.message);
      }
  
      return { message: "Location updated successfully" };
    } catch (error) {
      console.error("Location update error:", error);
      return { error: error instanceof Error ? error.message : "Failed to update location" };
    }
  }