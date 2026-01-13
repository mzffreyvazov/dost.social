// app/onboarding/location/page.tsx
'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { completeLocationOnboarding } from '../_actions'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// Define interfaces for our data types
interface LocationItem {
  id?: number | string;
  value: string;
  label: string;
  fullName?: string;
}
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
}
interface LocationData {
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

interface LoadingState {
  countries: boolean;
  cities: boolean;
}

// Inteface for Command components
interface CommandInputProps extends React.ComponentPropsWithoutRef<'input'> {
  placeholder?: string;
}

interface CommandEmptyProps extends React.ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode;
}

interface CommandGroupProps extends React.ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode;
}

interface CommandListProps extends React.ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode;
}

interface CommandItemProps {
  value: string;
  children: React.ReactNode;
  onSelect: (value: string) => void;
  className?: string;
}

const CommandWithChildren = Command as React.FC<{ children: React.ReactNode }>

// Cast the command sub-components to accept arbitrary props
const CommandInputWithTypes = CommandInput as React.FC<CommandInputProps>
const CommandEmptyWithTypes = CommandEmpty as React.FC<CommandEmptyProps>
const CommandGroupWithTypes = CommandGroup as React.FC<CommandGroupProps>
const CommandListWithTypes = CommandList as React.FC<CommandListProps>
const CommandItemWithTypes = CommandItem as React.FC<CommandItemProps>

export default function LocationOnboardingPage() {
  const [error, setError] = React.useState<string>('')
  const [countries, setCountries] = React.useState<LocationItem[]>([])
  const [cities, setCities] = React.useState<LocationItem[]>([])
  const [loading, setLoading] = React.useState<LoadingState>({ countries: false, cities: false })
  const [isLoading, setIsLoading] = React.useState(false)
  // Combobox states
  const [countryOpen, setCountryOpen] = React.useState<boolean>(false)
  const [cityOpen, setCityOpen] = React.useState<boolean>(false)
  
  const [locationData, setLocationData] = React.useState<LocationData>({
    country: '',
    city: '',
    latitude: null,
    longitude: null
  })
  
  const { user } = useUser()
  const router = useRouter()

// first useEffect
React.useEffect(() => {
  const fetchCountries = async () => {
    setLoading((prevState) => ({ ...prevState, countries: true }));
    try {
      const response = await fetch('/api/locations/countries');
      if (!response.ok) throw new Error('Failed to fetch countries');
      const data = await response.json();

      // Store country name alongside the code
      const formattedCountries = data
        .map((country: CountryData) => ({
          value: country.iso2,
          label: country.name,
          fullName: country.name // Store the full name
        }))
        .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

      setCountries(formattedCountries);
    } catch (error) {
      console.error('Error fetching countries:', error);
      setError('Failed to load countries list');
    } finally {
      setLoading((prevState) => ({ ...prevState, countries: false }));
    }
  };

  fetchCountries();
}, []);

// second useEffect
React.useEffect(() => {
  const fetchCities = async () => {
    if (!locationData.country) {
      setCities([]);
      return;
    }
    
    setLoading((prevState) => ({ ...prevState, cities: true }));
    try {
      // Find the selected country's ISO2 code
      const selectedCountry = countries.find(c => c.value === locationData.country);
      if (!selectedCountry) {
        throw new Error('Country not found');
      }

      const response = await fetch(`/api/locations/cities/${selectedCountry.value}`);

      if (!response.ok) throw new Error('Failed to fetch cities');
      const data = await response.json();

      // Debug response
      console.log('API response:', data);

      if (!Array.isArray(data)) {
        throw new Error('No cities data found');
      }

      const formattedCities = data
        .map((city: StateData) => ({
          id: city.id,
          value: city.name,
          label: city.name,
        }))
        .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

      setCities(formattedCities);
    } catch (error) {
      console.error('Error fetching states:', error);
      setError('Failed to load states list');
    } finally {
      setLoading((prevState) => ({ ...prevState, cities: false }));
    }
  };

  if (locationData.country) {
    fetchCities();
  }
}, [locationData.country, countries]); // Add countries to dependency array
  
  

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setIsLoading(true)
  try {
    const formData = new FormData()
    formData.append('country', locationData.country)
    formData.append('city', locationData.city)
    if (locationData.latitude) formData.append('latitude', locationData.latitude.toString())
    if (locationData.longitude) formData.append('longitude', locationData.longitude.toString())
    
    const response = await completeLocationOnboarding(formData)
    if (response?.message) {
      await user?.reload()
      router.push('/discover')
      return
    }
    if (response?.error) {
      setError(response.error)
      setIsLoading(false)
    }
  } catch {
    setError('An unexpected error occurred')
    setIsLoading(false)
  }
}

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">Where are you located?</h1>
        
        <div className="mb-6">
          <button
            disabled={true}
            className="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-foreground bg-muted hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 cursor-not-allowed"
            type="button"
          >
            Use my current location
          </button>
          <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-1 text-center">
            ⚡ Coming soon! This feature is currently under development.
          </p>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Please manually enter your location below
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="country" 
              className="block text-sm font-medium text-foreground mb-1"
            >
              Country
            </label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="country"
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between"
                  disabled={loading.countries}
                  type="button"
                >
                  {locationData.country
                    ? countries.find((country) => country.value === locationData.country)?.label || "Select country..."
                    : "Select country..."}
                  {loading.countries ? (
                    <span className="ml-auto animate-spin">○</span>
                  ) : (
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
              <CommandWithChildren>
                  <CommandInputWithTypes placeholder="Search country..." />
                  <CommandListWithTypes>
                    <CommandEmptyWithTypes>No country found.</CommandEmptyWithTypes>
                    <CommandGroupWithTypes>
                      {countries.map((country) => (
                        <CommandItemWithTypes
                          key={country.value}
                          value={country.value}
                          onSelect={(currentValue: string) => {
                            const newValue = currentValue === locationData.country ? "" : currentValue
                            setLocationData({
                              ...locationData, 
                              country: newValue,
                              city: ""
                            })
                            setCountryOpen(false)
                          }}
                        >
                          {country.label}
                          <Check
                            className={cn(
                              "ml-auto",
                              locationData.country === country.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItemWithTypes>
                      ))}
                    </CommandGroupWithTypes>
                  </CommandListWithTypes>
                </CommandWithChildren>
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <label 
              htmlFor="city" 
              className="block text-sm font-medium text-foreground mb-1"
            >
              City
            </label>
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="city"
                  variant="outline"
                  role="combobox"
                  aria-expanded={cityOpen}
                  className="w-full justify-between"
                  disabled={!locationData.country || loading.cities}
                  type="button"
                >
                  {locationData.city
                    ? cities.find((city) => city.value === locationData.city)?.label || "Select city..."
                    : "Select city..."}
                  {loading.cities ? (
                    <span className="ml-auto animate-spin">○</span>
                  ) : (
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
              <CommandWithChildren>
                <CommandInputWithTypes placeholder="Search city..." />
                <CommandListWithTypes>
                  <CommandEmptyWithTypes>No city found.</CommandEmptyWithTypes>
                  <CommandGroupWithTypes>
                    {cities.map((city) => (
                      <CommandItemWithTypes
                        key={city.id || city.value}
                        value={city.value}
                        onSelect={(currentValue: string) => {
                          setLocationData({
                            ...locationData, 
                            city: currentValue === locationData.city ? "" : currentValue
                          })
                          setCityOpen(false)
                        }}
                      >
                        {city.label}
                        <Check
                          className={cn(
                            "ml-auto",
                            locationData.city === city.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItemWithTypes>
                    ))}
                  </CommandGroupWithTypes>
                </CommandListWithTypes>
              </CommandWithChildren>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Hidden fields to pass coordinates if available */}
          <input type="hidden" name="latitude" value={locationData.latitude?.toString() || ''} />
          <input type="hidden" name="longitude" value={locationData.longitude?.toString() || ''} />

          {error && (
            <p className="text-destructive text-sm">Error: {error}</p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!locationData.country || !locationData.city || isLoading}
              className="inline-flex justify-center cursor-pointer py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                "Complete Onboarding"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}