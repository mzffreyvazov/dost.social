/* File: [Your Path]/create-event-dialog.tsx */

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { getCurrentUserId } from "@/lib/supabase"
import { useSupabase } from "@/hooks/useSupabase"
import { toast } from "sonner"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Define types for country and state data
interface CountryData {
  iso2: string;
  name: string;
  iso3: string;
  phonecode: string;
  capital: string;
  currency: string;
  native: string;
  emoji: string;
}

interface StateData {
  id: number;
  name: string;
  state_code?: string;
}

interface CountryOption {
  value: string;
  label: string;
  fullName: string;
}

interface CityOption {
  id?: number | string;
  value: string;
  label: string;
}

// Define the specific validation errors interface for this form
interface EventValidationErrors {
  title?: string;
  description?: string;
  startDate?: string;
  address?: string;
  city?: string;
  country?: string;
  maxAttendees?: string;
  locationUrl?: string; // Optional validation
}

// Define the state type for the form data
interface EventFormData {
  title: string;
  description: string;
  city: string;
  country: string;
  address: string;
  locationUrl: string;
  maxAttendees: string;
}

interface CreateEventDialogProps {
  communityId: string
  onEventCreated?: () => void
}

export function CreateEventDialog({ communityId, onEventCreated }: CreateEventDialogProps) {
  const router = useRouter()
  const { getSupabaseClient, isSignedIn } = useSupabase()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null) // Supabase integer ID
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  
  // Countries and cities data
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [loading, setLoading] = useState({
    countries: false,
    cities: false,
  })
  
  // UI state for comboboxes
  const [countryOpen, setCountryOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)

  // Use the specific validation errors type
  const [validationErrors, setValidationErrors] = useState<EventValidationErrors>({})

  // Initial state for the form data
  const initialEventState = useMemo<EventFormData>(() => ({
    title: "",
    description: "",
    city: "",
    country: "",
    address: "",
    locationUrl: "",
    maxAttendees: "",
  }), [])

  const [newEvent, setNewEvent] = useState<EventFormData>(initialEventState)

  // Function to reset form state
  const resetForm = useCallback(() => {
    setNewEvent(initialEventState)
    setStartDate(undefined)
    setEndDate(undefined)
    setValidationErrors({}) // Reset validation errors
    setIsLoading(false)
  }, [initialEventState])

  // Handle dialog open/close changes
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
  }, [resetForm])

  const handleCancel = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  // Effect for body scroll lock
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen])

  // Effect to fetch Supabase user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getCurrentUserId()
        setCurrentUserId(id)
      } catch {
        toast.error("Error fetching Supabase user ID.")
      }
    }
    if (isSignedIn) { // Only fetch if user is signed in
      fetchUserId()
    } else {
      setCurrentUserId(null)
    }
  }, [isSignedIn]) // Depend on isSignedIn from useSupabase

  // Add useEffect for fetching countries
  useEffect(() => {
    const fetchCountries = async () => {
      setLoading((prevState) => ({ ...prevState, countries: true }))
      try {
        const response = await fetch("/api/locations/countries")
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
      if (!newEvent.country) {
        setCities([])
        return
      }

      setLoading((prevState) => ({ ...prevState, cities: true }))
      try {
        const selectedCountry = countries.find((c) => c.value === newEvent.country)
        if (!selectedCountry) {
          throw new Error("Country not found")
        }

        const response = await fetch(`/api/locations/cities/${selectedCountry.value}`)

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

    if (newEvent.country) {
      fetchCities()
    }
  }, [newEvent.country, countries])

  // Update form data and clear validation error for the specific field
  const updateEventData = (field: keyof EventFormData, value: string) => {
    setNewEvent(prev => ({ ...prev, [field]: value }))
    // Clear validation error for this field when it's changed
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Validation function (similar to CreateCommunityModal)
  const validateForm = (): boolean => {
    const errors: EventValidationErrors = {}

    // Title validation
    if (!newEvent.title.trim()) {
      errors.title = "Event title is required"
    } else if (newEvent.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters"
    }

    // Description validation
    if (!newEvent.description.trim()) {
      errors.description = "Event description is required"
    }

    // Start Date validation
    if (!startDate) {
      errors.startDate = "Start date/time is required"
    } else if (endDate && startDate > endDate) {
        errors.startDate = "Start date cannot be after end date";
    }

    // Address validation
    if (!newEvent.address.trim()) {
      errors.address = "Address is required"
    }

    // City validation
    if (!newEvent.city.trim()) {
      errors.city = "City is required"
    }

    // Country validation
    if (!newEvent.country.trim()) {
      errors.country = "Country is required"
    }

    // Max Attendees validation (optional field, but validate if provided)
    if (newEvent.maxAttendees) {
        const max = parseInt(newEvent.maxAttendees, 10);
        if (isNaN(max) || max <= 0) {
            errors.maxAttendees = "Maximum attendees must be a positive number";
        }
    }

    // Optional: Location URL validation (e.g., check if it's a valid URL format)
    if (newEvent.locationUrl.trim()) {
        try {
            new URL(newEvent.locationUrl.trim());
        } catch {
            errors.locationUrl = "Please enter a valid URL (e.g., https://maps.google.com)";
        }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0 // Return true if no errors
  }

  // Event creation logic
  const handleCreateEvent = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form.")
      const firstErrorField = Object.keys(validationErrors)[0] as keyof EventValidationErrors | undefined;
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.focus();
        if (firstErrorField === 'startDate') {
            const datePickerButton = document.querySelector('#startDate button');
            (datePickerButton as HTMLElement)?.focus();
        }
      }
      return
    }

    if (!currentUserId) {
      toast.error("Authentication error. Please ensure you are logged in.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    
    // Get authenticated Supabase client
    const supabase = await getSupabaseClient()

    const eventData = {
      title: newEvent.title.trim(),
      description: newEvent.description.trim(),
      start_time: startDate!.toISOString(),
      end_time: endDate ? endDate.toISOString() : null,
      community_id: parseInt(communityId),
      created_by: currentUserId,
      address: newEvent.address.trim(),
      city: newEvent.city.trim(),
      country: newEvent.country.trim(),
      is_online: false,
      location_url: newEvent.locationUrl.trim() || null,
      max_attendees: newEvent.maxAttendees ? parseInt(newEvent.maxAttendees) : null,
    }

    try {
      const { data, error } = await supabase.from("events")
        .insert(eventData)
        .select()
        .single()

      if (error) {
        toast.error(`Failed to create event: ${error.message}`)
      } else if (data) {
        toast.success("Event created successfully!")
        handleOpenChange(false)

        if (onEventCreated) {
          onEventCreated()
        }
        router.refresh()
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger id="create-event-dialog" className="hidden">
        Create Event
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Event</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-6 py-4">
          <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center font-medium">
              Event Title
            </Label>
            <Input
              id="title"
              value={newEvent.title}
              onChange={(e) => updateEventData("title", e.target.value)}
              placeholder="What's your event called?"
              className={cn(validationErrors.title && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={Boolean(validationErrors.title)}
              aria-describedby="title-error"
              required
            />
            {validationErrors.title && (
              <p id="title-error" className="text-sm text-destructive mt-1">{validationErrors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={newEvent.description}
              onChange={(e) => updateEventData("description", e.target.value)}
              placeholder="Provide details about your event..."
              rows={4}
              className={cn(validationErrors.description && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={Boolean(validationErrors.description)}
              aria-describedby="description-error"
              required
            />
            {validationErrors.description && (
              <p id="description-error" className="text-sm text-destructive mt-1">{validationErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center font-medium">
                Start Date/Time
              </Label>
              <div id="startDate" className={cn(validationErrors.startDate && "border-destructive")}>
                <DateTimePicker
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    if (validationErrors.startDate) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.startDate;
                        return newErrors;
                      });
                    }
                  }}
                  aria-describedby="startDate-error"
                  label="Start Time"
                />
              </div>
              {validationErrors.startDate && (
                <p id="startDate-error" className="text-sm text-destructive mt-1">{validationErrors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDateTime" className="font-medium">End Date/Time</Label>
              <DateTimePicker
                value={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  if (validationErrors.startDate && startDate && date && startDate <= date) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.startDate;
                      return newErrors;
                    });
                  }
                }}
                label="End Time"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center font-medium">
              Address
            </Label>
            <Input
              id="address"
              value={newEvent.address}
              onChange={(e) => updateEventData("address", e.target.value)}
              placeholder="Enter street address"
              className={cn(validationErrors.address && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={Boolean(validationErrors.address)}
              aria-describedby="address-error"
              required
            />
            {validationErrors.address && (
              <p id="address-error" className="text-sm text-destructive mt-1">{validationErrors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center font-medium">
                Country
              </Label>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="country"
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryOpen}
                    aria-label="Select a country"
                    className={cn(
                      "w-full justify-between",
                      validationErrors.country && "border-destructive focus-visible:ring-destructive",
                      !newEvent.country && "text-muted-foreground"
                    )}
                    onClick={() => setCountryOpen(!countryOpen)}
                    disabled={loading.countries}
                  >
                    {newEvent.country
                      ? countries.find((country) => country.value === newEvent.country)?.label || "Select country"
                      : "Select country"}
                    {loading.countries ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandList className="max-h-[300px]">
                      <CommandGroup>
                        {countries.map((country) => (
                          <CommandItem
                            key={country.value}
                            value={country.label}
                            onSelect={() => {
                              const value = country.value;
                              updateEventData("country", value);
                              updateEventData("city", ""); 
                              setCountryOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newEvent.country === country.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {country.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {validationErrors.country && (
                <p id="country-error" className="text-sm text-destructive mt-1">{validationErrors.country}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center font-medium">
                City
              </Label>
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="city"
                    variant="outline"
                    role="combobox"
                    aria-expanded={cityOpen}
                    aria-label="Select a city"
                    className={cn(
                      "w-full justify-between",
                      validationErrors.city && "border-destructive focus-visible:ring-destructive",
                      !newEvent.city && "text-muted-foreground"
                    )}
                    onClick={() => setCityOpen(!cityOpen)}
                    disabled={loading.cities || !newEvent.country}
                  >
                    {newEvent.city
                      ? cities.find((city) => city.value === newEvent.city)?.label || newEvent.city
                      : newEvent.country 
                        ? "Select city" 
                        : "Select country first"}
                    {loading.cities ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search city..." />
                    <CommandEmpty>
                      {!cities.length 
                        ? "No cities available for the selected country." 
                        : "No city found."}
                    </CommandEmpty>
                    <CommandList className="max-h-[300px]">
                      <CommandGroup>
                        {cities.map((city) => (
                          <CommandItem
                            key={city.id || city.value}
                            value={city.label}
                            onSelect={() => {
                              updateEventData("city", city.value);
                              setCityOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newEvent.city === city.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {city.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {validationErrors.city && (
                <p id="city-error" className="text-sm text-destructive mt-1">{validationErrors.city}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationUrl" className="font-medium">Place Location URL</Label>
            <Input
              id="locationUrl"
              value={newEvent.locationUrl}
              onChange={(e) => updateEventData("locationUrl", e.target.value)}
              placeholder="e.g., https://maps.google.com/your-place"
              className={cn(validationErrors.locationUrl && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={Boolean(validationErrors.locationUrl)}
              aria-describedby="locationUrl-error"
            />
            {validationErrors.locationUrl && (
              <p id="locationUrl-error" className="text-sm text-destructive mt-1">{validationErrors.locationUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAttendees" className="font-medium">Maximum Attendees</Label>
            <Input
              id="maxAttendees"
              type="number"
              min="1"
              value={newEvent.maxAttendees}
              onChange={(e) => updateEventData("maxAttendees", e.target.value)}
              placeholder="Leave empty for unlimited"
              className={cn(validationErrors.maxAttendees && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={Boolean(validationErrors.maxAttendees)}
              aria-describedby="maxAttendees-error"
            />
            {validationErrors.maxAttendees && (
              <p id="maxAttendees-error" className="text-sm text-destructive mt-1">{validationErrors.maxAttendees}</p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-6 border-t mt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            type="button"
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateEvent}
            disabled={isLoading}
            className="cursor-pointer flex items-center gap-2"
            type="button"
          >
            {isLoading ? "Creating..." : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}