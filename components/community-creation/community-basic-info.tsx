"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, ImagePlus, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import type { CommunityData } from "./create-community-modal"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface LocationItem {
  value: string
  label: string
  fullName?: string
}

interface LoadingState {
  countries: boolean
  cities: boolean
}

interface CommunityBasicInfoProps {
  data: CommunityData
  updateData: (data: Partial<CommunityData>) => void
  countries: LocationItem[]
  cities: LocationItem[]
  loading: LoadingState
  countryOpen: boolean
  setCountryOpen: (open: boolean) => void
  cityOpen: boolean
  setCityOpen: (open: boolean) => void
  onImageUpload: (file: File) => void;
  validationErrors: {
    name?: string;
    description?: string;
    country?: string;
    city?: string;
    tags?: string;
  };
}

export function CommunityBasicInfo({
  data,
  updateData,
  countries,
  cities,
  loading,
  countryOpen,
  setCountryOpen,
  cityOpen,
  setCityOpen,
  validationErrors,
}: CommunityBasicInfoProps) {
  const [tagInput, setTagInput] = useState("")

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      if (!data.tags.includes(tagInput.trim())) {
        updateData({ tags: [...data.tags, tagInput.trim()] })
      }
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    updateData({ tags: data.tags.filter((t) => t !== tag) })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        updateData({ image: event.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Community Name</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => updateData({ name: e.target.value })}
          placeholder="Enter community name"
          required
          className={cn(validationErrors.name && "border-red-500")}
        />
        {validationErrors.name && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">What is this community for?</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
          placeholder="Describe your community's purpose"
          rows={3}
          className={cn(validationErrors.description && "border-red-500")}
        />
        {validationErrors.description && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={countryOpen}
                disabled={loading.countries}
                className={cn(
                  "cursor-pointer w-full justify-between",
                  validationErrors.country && "border-red-500"
                )}
              >
                {loading.countries ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : data.country ? (
                  countries.find((country) => country.value === data.country)?.label || "Select country..."
                ) : (
                  "Select country..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 max-h-[300px]">
              <Command className="w-full">
                <CommandInput placeholder="Search country..." />
                <CommandList className="max-h-[232px] overflow-y-auto scrollbar-thin">
                  <div className="touch-auto pointer-events-auto">
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {countries.map((country) => (
                        <CommandItem
                          key={country.value}
                          value={country.value}
                          onSelect={() => {
                            updateData({
                              country: country.value,
                              // Clear city if country changes
                              city: "",
                            })
                            setCountryOpen(false)
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", data.country === country.value ? "opacity-100" : "opacity-0")}
                          />
                          {country.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </div>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {validationErrors.country && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.country}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City/State</Label>
          <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={cityOpen}
                disabled={!data.country || loading.cities}
                className={cn(
                  "cursor-pointer w-full justify-between",
                  validationErrors.city && "border-red-500"
                )}
              >
                {loading.cities ? (
                  <div className=" cursor-pointer flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : data.city ? (
                  cities.find((city) => city.value === data.city)?.label || "Select city/state..."
                ) : (
                  "Select city/state..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 max-h-[300px]">
              <Command className="w-full">
                <CommandInput placeholder="Search city/state..." />
                <CommandList className="max-h-[232px] overflow-y-auto scrollbar-thin">
                  <div className="touch-auto pointer-events-auto">
                    <CommandEmpty>No city/state found.</CommandEmpty>
                    <CommandGroup>
                      {cities.map((city, index) => (
                        <CommandItem
                          key={`${city.value}-${index}`}
                          value={city.value}
                          onSelect={() => {
                            updateData({ city: city.value })
                            setCityOpen(false)
                          }}
                          className="cursor-pointer"
                        >
                          <Check className={cn("mr-2 h-4 w-4", data.city === city.value ? "opacity-100" : "opacity-0")} />
                          {city.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </div>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {validationErrors.city && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.city}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (Press Enter to add)</Label>
        <Input
          id="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Add tags to help people find your community"
          className={cn(validationErrors.tags && "border-red-500")}
        />
        {validationErrors.tags && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.tags}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          {data.tags.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="flex items-center gap-1.5 py-1.5 px-3 text-sm group"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(tag);
                }}
                className="focus:outline-none rounded-full h-5 w-5 inline-flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Community Image</Label>
        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 border rounded-md flex items-center justify-center overflow-hidden"
            style={{ background: "#f1f5f9" }}
          >
            {data.image ? (
              <img src={data.image || "/placeholder.svg"} alt="Community" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div>
            <Label
              htmlFor="image-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Upload Image
            </Label>
            <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <p className="text-sm text-muted-foreground mt-1">Recommended size: 512x512px</p>
          </div>
        </div>
      </div>
    </div>
  )
}

