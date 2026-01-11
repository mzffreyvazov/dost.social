'use client'

export const dynamic = 'force-dynamic';

import { createBrowserClient } from '@/lib/supabase'
import { Search, Users, Calendar, MapPinIcon } from 'lucide-react'
import Link from 'next/link'
import { CreateCommunityButton } from '@/components/community-creation/create-community-button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

// Add these interfaces at the top of your file
interface Tag {
  id: string;
  name: string;
}

interface CommunityWithTags {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  owner_id: number;
  city: string | null;
  country: string | null;
  cover_image_url: string | null;
  image_url?: string | null;
  is_online: boolean;
  member_count: number;
  community_tags: {
    tag_id: string;
    tags: Tag;
  }[];
}

interface EventData {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  is_online: boolean;
  max_attendees: number;
  address: string;
  created_by: number;
  created_at: string;
  image_url?: string | null;
  category?: string;
  attendees_count?: number;
  community_id?: number;
}

// Helper function to generate avatar fallback from community name
function getAvatarFallback(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DiscoverPage() {
  const [communities, setCommunities] = useState<CommunityWithTags[]>([])
  const [events, setEvents] = useState<EventData[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')

  const supabase = createBrowserClient()

  // Category pills for the search bar
  const categoryPills = [
    'All',
    'Outdoors',
    'Arts',
    'Technology',
    'Food',
    'Books',
    'Fitness',
    'Music',
    'Gaming',
  ];

  useEffect(() => {
    async function fetchData() {
      // Fetch communities
      const { data: communitiesData } = await supabase
        .from('communities')
        .select(`
          *,
          community_tags(
            tag_id,
            tags:tag_id(
              id,
              name
            )
          )
        `).limit(100)
      
      // Fetch latest events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)
      
      setCommunities(communitiesData || [])
      setEvents(eventsData || [])
    }

    fetchData()
  }, [supabase])

  // Show only first 6 communities
  const displayedCommunities = communities.slice(0, 6)
  const hasMoreCommunities = communities.length > 6

  return (
    <div className="min-h-screen">
      {/* --- TOP HERO SECTION --- */}
      <section className="py-12 px-4 -mt-6">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Discover Communities
            </h1>
            <p className="text-base text-muted-foreground max-w-lg mx-auto">
              Find groups that match your interests
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-background p-2 rounded-lg border flex gap-2">
              <div className="flex-grow relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  placeholder="Search interests or communities..." 
                  className="w-full h-10 pl-9 pr-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-ring/50 text-sm bg-background"
                />
              </div>
              <Button className="h-10 px-4 text-sm font-normal">
                Search
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {categoryPills.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground" 
                      : "bg-background text-muted-foreground hover:bg-accent border"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- MAIN CONTENT --- */}
      <main className="container mx-auto px-4 py-12">

        {/* --- HEADER WITH SORT AND CREATE --- */}
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:justify-between sm:items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Popular Communities</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm whitespace-nowrap">Sort by:</span>
              <select className="border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50 bg-background text-foreground">
                <option>Recommended</option>
                <option>Newest</option>
                <option>Most Members</option>
                <option>Closest</option>
              </select>
            </div>
            <CreateCommunityButton />
          </div>
        </div>

        {/* --- COMMUNITY CARDS --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-md sm:max-w-none mx-auto">
          {displayedCommunities?.map((community) => {
            // Get the first tag as the category badge
            const primaryTag = community.community_tags?.[0]?.tags?.name || 'Community';
            const avatarFallback = getAvatarFallback(community.name);
            
            return (
              <Card 
                key={community.id} 
                className="overflow-hidden border hover:shadow-md transition-all !py-0"
              >
                {/* Image Section */}
                <div className="relative h-48 w-full bg-muted">
                  {community.image_url ? (
                    <img 
                      src={community.image_url} 
                      alt={community.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <span className="text-4xl font-bold text-muted-foreground/30">
                        {avatarFallback}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-primary/80 hover:bg-primary text-primary-foreground text-xs font-normal">
                      {primaryTag}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium text-foreground line-clamp-1 mb-2">{community.name}</h3>
                  
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                    {community.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="h-3.5 w-3.5 mr-1" />
                      <span>{community.member_count || 0}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-3.5 w-3.5 mr-1" />
                      <span>{community.city || 'Global'}</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="px-4 pb-4 pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full text-sm font-normal"
                    asChild
                  >
                    <Link href={`/community/${community.id}`}>
                      View Details
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </section>

        {/* --- LOAD MORE --- */}
        {hasMoreCommunities && (
          <div className="mt-12 flex justify-center">
            <Button variant="outline">
              Load More Communities
            </Button>
          </div>
        )}

        {/* --- UPCOMING EVENTS SECTION --- */}
        {events.length > 0 && (
          <section className="mt-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                View All Events
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden hover:shadow-md transition-all !py-0">
                  <div className="relative h-40 bg-muted">
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={event.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {event.category && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary/80 hover:bg-primary text-primary-foreground text-xs">
                          {event.category}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">{event.title}</h3>
                    
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-4">
                      {event.start_time && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>{new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center pb-4">
                      <span className="text-sm text-muted-foreground">
                        {event.attendees_count || 0} attending
                      </span>
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <Link href={`/community/${event.community_id}/event/${event.id}`}>
                          Learn More
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}