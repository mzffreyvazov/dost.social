"use client"

import * as React from "react"
import { Camera } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { fetchInterests } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface InterestTag {
  id: string
  label: string
}


interface UserInfoFormProps extends React.HTMLAttributes<HTMLDivElement> {
    onSave?: (data: { 
      bio: string; 
      interests: string[]; 
      profilePhoto?: File 
    }) => Promise<{ success?: boolean; error?: string } | void>
    initialBio?: string
    initialInterests?: string[]
  }

export function UserInfoForm({
  className,
  onSave,
  initialBio = "",
  initialInterests = [],
  ...props
}: UserInfoFormProps) {
  const [interests, setInterests] = React.useState<InterestTag[]>([])
  const [bio, setBio] = React.useState(initialBio)
  const [selectedInterests, setSelectedInterests] = React.useState<string[]>(initialInterests)
  const [profilePhoto, setProfilePhoto] = React.useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = React.useState(false)

    // Fetch interests when component mounts
    React.useEffect(() => {
        async function loadInterests() {
            const interestsData = await fetchInterests()
            setInterests(interestsData)
        }
        loadInterests()
        }, [])
    
  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  // Compress image to reduce file size for mobile uploads
  const compressImage = async (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file) // Return original if canvas not supported
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Compress image if it's larger than 1MB
      let processedFile = file
      if (file.size > 1024 * 1024) {
        try {
          processedFile = await compressImage(file, 800, 0.8)
        } catch (error) {
          console.error('Image compression failed, using original:', error)
        }
      }
      
      setProfilePhoto(processedFile)

      // Create preview URL
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string)
      }
      reader.readAsDataURL(processedFile)
    }
  }

//   const handleRemovePhoto = () => {
//     setProfilePhoto(null)
//     setPhotoPreview(null)
//     if (fileInputRef.current) {
//       fileInputRef.current.value = ""
//     }
//   }

const handleSave = async () => {
    if (onSave) {
      setIsLoading(true)
      try {
        await onSave({
          bio,
          interests: selectedInterests,
          profilePhoto: profilePhoto || undefined,
        })
      } catch (error) {
        console.error('Error saving user info:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className={cn("w-full max-w-md mx-auto bg-card rounded-lg shadow-lg p-8", className)} {...props}>
      <h1 className="text-2xl font-bold text-center mb-6 text-foreground">Tell us more about yourself</h1>

      <div className="space-y-6">
        {/* Profile Photo Upload */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border border-border shadow-md">
              {photoPreview ? (
                <Image src={photoPreview || "/placeholder.svg"} alt="Profile preview" fill className="object-cover" />
              ) : (
                <div className="h-24 w-24 bg-muted flex items-center justify-center text-4xl">👤</div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              id="profile-photo-input"
            />

            <label
              htmlFor="profile-photo-input"
              className="absolute bottom-0 right-0 rounded-full bg-background text-foreground p-2 cursor-pointer shadow-md border border-border"
            >
              <Camera className="h-4 w-4" />
            </label>
          </div>
        </div>

        {/* Bio Section */}
        <div className="space-y-2">
          <h3 className="text-base font-medium text-foreground">Bio</h3>
          <Textarea
            placeholder="Share a little about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-[120px] resize-none border border-border rounded-md focus:ring-1 focus:ring-ring focus:border-ring shadow-sm bg-background text-foreground"
          />
        </div>

        {/* Interests Section */}
        <div className="space-y-2">
          <h3 className="text-base font-medium text-foreground">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
                <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                type="button"
                className={cn(
                    "px-4 py-2 text-sm transition-colors border rounded-full shadow-sm cursor-pointer",
                    selectedInterests.includes(interest.id)
                    ? "bg-primary text-primary-foreground border-primary "
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
                >
                {interest.label}
                </button>
            ))}
            </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-8">
        <Button 
          onClick={handleSave} 
          className="w-full cursor-pointer"
          disabled={isLoading}
          type="button"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Please wait
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  )
}

