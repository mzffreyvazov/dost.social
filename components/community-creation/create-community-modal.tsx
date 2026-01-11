"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CommunityBasicInfo } from "./community-basic-info"
import { CommunityChatRooms } from "./community-chat-rooms"
import { CommunitySettings } from "./community-settings"
import { Button } from "@/components/ui/button"
import { AnimatePresence, motion } from "framer-motion"
import { createFullCommunity, getCurrentUserId } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// Add these interfaces at the top of the file
interface LocationItem {
  id?: number | string
  value: string
  label: string
  fullName?: string
}

interface CountryData {
  iso2: string
  name: string
  iso3: string
  phonecode: string
  capital: string
  currency: string
  native: string
  emoji: string
}

interface StateData {
  id: number
  name: string
}

interface LoadingState {
  countries: boolean
  cities: boolean
  submit: boolean
}

// Add after other interfaces
interface ValidationErrors {
  name?: string;
  description?: string;
  country?: string;
  city?: string;
  tags?: string;
}

// Update the CommunityData type to include location fields
export type CommunityData = {
  name: string
  description: string
  tags: string[]
  image: string | undefined
  country: string
  city: string
  chatRooms: { name: string; type: "text" | "voice" | "video" }[]
  isPrivate: boolean
}

// Update the defaultCommunityData to include empty location fields
const defaultCommunityData: CommunityData = {
  name: "",
  description: "",
  tags: [],
  image: undefined,
  country: "",
  city: "",
  chatRooms: [{ name: "general", type: "text" }],
  isPrivate: false,
}

const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

interface CreateCommunityModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateCommunityModal({ isOpen, onClose }: CreateCommunityModalProps) {
  const [activeTab, setActiveTab] = useState("basic-info")
  const [communityData, setCommunityData] = useState<CommunityData>(defaultCommunityData)
  const router = useRouter()

  // Add location data states
  const [countries, setCountries] = useState<LocationItem[]>([])
  const [cities, setCities] = useState<LocationItem[]>([])
  const [loading, setLoading] = useState<LoadingState>({ 
    countries: false, 
    cities: false,
    submit: false
  })
  const [countryOpen, setCountryOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  
  // Remove unused imageFile state or uncomment related functionality
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const getScrollbarWidth = () => {
    const outer = document.createElement("div")
    outer.style.visibility = "hidden"
    outer.style.overflow = "scroll"
    document.body.appendChild(outer)

    const inner = document.createElement("div")
    outer.appendChild(inner)

    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth

    outer.parentNode?.removeChild(outer)

    return scrollbarWidth
  }

  useEffect(() => {
    if (isOpen) {
      const scrollWidth = getScrollbarWidth()
      document.body.style.overflow = "hidden"
      document.body.style.paddingRight = `${scrollWidth}px`
    } else {
      document.body.style.overflow = "auto"
      document.body.style.paddingRight = `0`
    }
    return () => {
      document.body.style.overflow = "auto"
      document.body.style.paddingRight = `0`
    }
  }, [isOpen])

  // Add useEffect for fetching countries
  useEffect(() => {
    const fetchCountries = async () => {
      setLoading((prevState) => ({ ...prevState, countries: true }))
      try {
        const apiKey = process.env.NEXT_PUBLIC_COUNTRY_STATE_CITY_API_KEY
        if (!apiKey) {
          throw new Error("API key not configured")
        }

        const response = await fetch("https://api.countrystatecity.in/v1/countries", {
          headers: {
            "X-CSCAPI-KEY": apiKey
          }
        })
        if (!response.ok) throw new Error("Failed to fetch countries")
        const data = await response.json()

        const formattedCountries = data
          .map((country: CountryData) => ({
            value: country.iso2,
            label: country.name,
            fullName: country.name,
          }))
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))

        setCountries(formattedCountries)
      } catch {
        toast.error("Failed to fetch countries. Please try again.")
      } finally {
        setLoading((prevState) => ({ ...prevState, countries: false }))
      }
    }

    fetchCountries()
  }, [])

  // Add useEffect for fetching cities
  useEffect(() => {
    const fetchCities = async () => {
      if (!communityData.country) {
        setCities([])
        return
      }

      setLoading((prevState) => ({ ...prevState, cities: true }))
      try {
        const apiKey = process.env.NEXT_PUBLIC_COUNTRY_STATE_CITY_API_KEY
        if (!apiKey) {
          throw new Error("API key not configured")
        }

        const selectedCountry = countries.find((c) => c.value === communityData.country)
        if (!selectedCountry) {
          throw new Error("Country not found")
        }

        const response = await fetch(`https://api.countrystatecity.in/v1/countries/${selectedCountry.value}/cities`, {
          headers: {
            "X-CSCAPI-KEY": apiKey
          }
        })

        if (!response.ok) throw new Error("Failed to fetch cities")
        const data = await response.json()

        if (!Array.isArray(data)) {
          throw new Error("No cities data found")
        }

        const formattedCities = data
          .map((city: StateData) => ({
            id: city.id,
            value: city.name,
            label: city.name,
          }))
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))

        setCities(formattedCities)
      } catch {
        toast.error("Failed to fetch states. Please try again.")
      } finally {
        setLoading((prevState) => ({ ...prevState, cities: false }))
      }
    }

    if (communityData.country) {
      fetchCities()
    }
  }, [communityData.country, countries])

  // Add reset function
  const resetForm = () => {
    setCommunityData(defaultCommunityData)
    setActiveTab("basic-info")
    setValidationErrors({})
    setCities([])
  }

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm()
      onClose()
    }
  }

  const handleSave = async () => {
    // Validate required fields
    if (!communityData.name.trim()) {
      toast.error("Please provide a name for your community.")
      setActiveTab("basic-info")
      return
    }

    if (communityData.chatRooms.some(room => !room.name.trim())) {
      toast.error("All chat rooms must have a name.")
      setActiveTab("chat-rooms")
      return
    }

    // Set loading state
    setLoading(prev => ({ ...prev, submit: true }))

    try {
      // Get the current user ID from Supabase
      const userId = await getCurrentUserId()
      
      if (!userId) {
        throw new Error("User not found. Please sign in again.")
      }

      // Get country and city full names
      const countryName = communityData.country ? 
        countries.find(c => c.value === communityData.country)?.fullName || "" :
        ""
      
      const cityName = communityData.city || ""

      // Save the community data
      const { success } = await createFullCommunity(
        {
          name: communityData.name,
          description: communityData.description,
          owner_id: userId,
          city: cityName,
          country: countryName,
          cover_image_url: undefined,
          is_online: false // Default to false, you can add a field for this later
        },
        communityData.chatRooms,
        communityData.tags
      )

      if (!success) {
        throw new Error("Failed to create community.")
      }

      // Show success toast
      toast.success("Your community has been created successfully!")

      // Close the modal and reset form
      resetForm()
      onClose()
      router.refresh();
      setTimeout(() => {
        router.refresh();
      }, 300);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create community. Please try again.")
    } finally {
      setLoading(prev => ({ ...prev, submit: false }))
    }
  }

  const updateCommunityData = (data: Partial<CommunityData>) => {
    setCommunityData((prev) => ({ ...prev, ...data }))
  }

  // Add this validation function
  const validateBasicInfo = () => {
    const errors: ValidationErrors = {}
    
    if (!communityData.name.trim()) {
      errors.name = "Community name is required"
    } else if (communityData.name.length < 3) {
      errors.name = "Name must be at least 3 characters"
    }

    if (!communityData.description.trim()) {
      errors.description = "Description is required"
    }

    if (!communityData.country) {
      errors.country = "Please select a country"
    }

    if (!communityData.city && communityData.country) {
      errors.city = "Please select a city/state"
    }

    if (communityData.tags.length === 0) {
      errors.tags = "Add at least one tag"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (activeTab === "basic-info") {
      if (!validateBasicInfo()) {
        toast.error("Please fill in all required fields")
        return
      }
      setActiveTab("chat-rooms")
    }
    else if (activeTab === "chat-rooms") {
      // Validate chat rooms before proceeding
      if (communityData.chatRooms.some(room => !room.name.trim())) {
        toast.error("All chat rooms must have a name.")
        return
      }
      setActiveTab("settings")
    }
  }

  const handleBack = () => {
    if (activeTab === "chat-rooms") setActiveTab("basic-info")
    else if (activeTab === "settings") setActiveTab("chat-rooms")
  }

  // Remove or modify this function since imageFile state is unused
  const handleImageUpload = () => {
    // This function is called but doesn't do anything meaningful now
    // We'll keep it to maintain the component interface, but it won't set imageFile anymore
  }

  // Add new handler for tab clicks
  const handleTabClick = (tabName: string) => {
    if (tabName === activeTab) return;

    // Going forward requires validation
    if (
      (activeTab === "basic-info" && (tabName === "chat-rooms" || tabName === "settings")) ||
      (activeTab === "chat-rooms" && tabName === "settings")
    ) {
      if (activeTab === "basic-info") {
        if (!validateBasicInfo()) {
          toast.error("Please fill in all required fields in Basic Info")
          return
        }
      } else if (activeTab === "chat-rooms") {
        if (communityData.chatRooms.some(room => !room.name.trim())) {
          toast.error("All chat rooms must have a name")
          return
        }
      }
    }

    setActiveTab(tabName)
  }

  // Add helper function to determine if a tab is clickable
  const isTabClickable = (tabName: string) => {
    if (tabName === "basic-info") return true;
    if (tabName === "chat-rooms") return Object.keys(validationErrors).length === 0;
    if (tabName === "settings") {
      return Object.keys(validationErrors).length === 0 && 
             !communityData.chatRooms.some(room => !room.name.trim());
    }
    return false;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh] [&>button]:cursor-pointer">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Community</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto pr-2 no-scrollbar">
          <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {/* Tabs section with full width coverage */}
          <div className="sticky top-0 z-10 -mx-2 px-2 pb-6">
            {/* Background that extends beyond the rounded corners */}
            <div className="absolute inset-x-0 -top-4 h-[calc(100%+1rem)] bg-background" />

            {/* Tabs container */}
            <div className="relative flex p-1 bg-muted/20 rounded-lg">
              {/* The animated background pill */}
              <motion.div
                className="absolute h-[85%] top-[7.5%] rounded-md bg-white dark:bg-slate-800 shadow-sm"
                animate={{
                  left: activeTab === "basic-info" ? "0%" : activeTab === "chat-rooms" ? "33.333%" : "66.666%",
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 1,
                }}
                style={{ width: "33.333%" }}
              />

              {/* Update tab buttons with clickable state */}
              <button
                onClick={() => handleTabClick("basic-info")}
                className={`flex-1 py-2 z-20 relative text-sm font-medium transition-colors rounded-md
                  ${activeTab === "basic-info" 
                    ? "text-foreground hover:text-foreground" 
                    : "text-muted-foreground hover:text-foreground/80"}
                  ${isTabClickable("basic-info") ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                Basic Info
              </button>
              <button
                onClick={() => handleTabClick("chat-rooms")}
                className={`flex-1 py-2 z-20 relative text-sm font-medium transition-colors rounded-md
                  ${activeTab === "chat-rooms" 
                    ? "text-foreground hover:text-foreground" 
                    : "text-muted-foreground hover:text-foreground/80"}
                  ${isTabClickable("chat-rooms") ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                Chat Rooms
              </button>
              <button
                onClick={() => handleTabClick("settings")}
                className={`flex-1 py-2 z-20 relative text-sm font-medium transition-colors rounded-md
                  ${activeTab === "settings" 
                    ? "text-foreground hover:text-foreground" 
                    : "text-muted-foreground hover:text-foreground/80"}
                  ${isTabClickable("settings") ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Content with increased spacing from tabs */}
          <div className="relative z-0 mt-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tabVariants}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "basic-info" && (
                  <CommunityBasicInfo
                    data={communityData}
                    updateData={(newData) => {
                      updateCommunityData(newData)
                      // Clear validation errors for updated fields
                      const updatedErrors = { ...validationErrors }
                      Object.keys(newData).forEach(key => {
                        delete updatedErrors[key as keyof ValidationErrors]
                      })
                      setValidationErrors(updatedErrors)
                    }}
                    countries={countries}
                    cities={cities}
                    loading={loading}
                    countryOpen={countryOpen}
                    setCountryOpen={setCountryOpen}
                    cityOpen={cityOpen}
                    setCityOpen={setCityOpen}
                    onImageUpload={handleImageUpload}
                    validationErrors={validationErrors}
                  />
                )}
                {activeTab === "chat-rooms" && (
                  <CommunityChatRooms data={communityData} updateData={updateCommunityData} />
                )}
                {activeTab === "settings" && <CommunitySettings data={communityData} updateData={updateCommunityData} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          {activeTab !== "basic-info" ? (
            <Button variant="outline" onClick={handleBack} disabled={loading.submit} className="cursor-pointer">
              Back
            </Button>
          ) : (
            <div></div>
          )}

          {activeTab !== "settings" ? (
            <Button onClick={handleNext} disabled={loading.submit} className="cursor-pointer">Next</Button>
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={loading.submit}
              className="cursor-pointer flex items-center gap-2"
            >
              {loading.submit && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading.submit ? "Creating..." : "Create Community"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}