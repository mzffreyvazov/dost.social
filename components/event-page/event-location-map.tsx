"use client"

import { Map, MapControls, MapMarker, MarkerContent } from "@/components/ui/map"
import { Card } from "@/components/ui/card"
import { MapPin } from "lucide-react"

interface EventLocationMapProps {
  address?: string
  latitude?: number
  longitude?: number
}

export function EventLocationMap({ 
  address, 
  latitude = 40.4093, // Default to Baku coordinates if not provided
  longitude = 49.8671 
}: EventLocationMapProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Location</h2>
      <div className="flex items-start gap-2 mb-3">
        <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          {address || "Address not provided for this event"}
        </p>
      </div>
      <Card className="h-[300px] p-0 overflow-hidden">
        <Map center={[longitude, latitude]} zoom={12}>
          <MapMarker longitude={longitude} latitude={latitude}>
            <MarkerContent>
              <div className="relative">
                {/* Classic map pin icon with black/white color scheme */}
                <MapPin className="h-8 w-8 text-black dark:text-white fill-black dark:fill-white drop-shadow-lg" />
              </div>
            </MarkerContent>
          </MapMarker>
          <MapControls 
            showZoom={true} 
            showLocate={false}
            showCompass={false}
            showFullscreen={false}
          />
        </Map>
      </Card>
    </Card>
  )
}
