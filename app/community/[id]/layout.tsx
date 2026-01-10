import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { CommunityHeader } from '@/components/community-page/community-header'
import { CommunityNavigation } from '@/components/community-page/community-navigation'

// Define interfaces for TypeScript
interface Tag {
  id: string;
  name: string;
}

interface CommunityTag {
  tag_id: string;
  tags: Tag;
}

// interface Community {
//   id: string;
//   name: string;
//   description: string;
//   created_at: string;
//   city: string | null;
//   state: string | null;
//   country: string | null;
//   member_count: number | null;
//   activity_level: string | null;
//   community_tags: CommunityTag[];
// }

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{
    id: string
  }>
}

export default async function CommunityLayout({ children, params }: LayoutProps) {
  const supabase = createAdminClient()
  const { id } = await params
  const { data: community } = await supabase
    .from('communities')
    .select(`
      *,
      community_tags(
        tags(
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!community) {
    notFound()
  }

  // Transform community data to match the component props structure
  const formattedCommunity = {
    id: community.id,
    name: community.name,
    description: community.description,
    memberCount: community.member_count || 0,
    tags: community.community_tags?.map((tag: CommunityTag) => tag.tags?.name || 'Unknown') || [],
    image: null, // No image in our database yet
    rules: [], // No rules in our database yet
    createdAt: community.created_at,
    moderators: [
      {
        id: 'mod-1',
        name: 'Community Admin',
        avatar: '/placeholder.svg'
      }
    ]
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Community Header Component */}
        <CommunityHeader community={formattedCommunity} />
        
        {/* Community Navigation Component */}
        <CommunityNavigation communityId={community.id} />
        
        {/* Pass the fetched data to child pages */}
        <div className="py-6">
          {children}
        </div>
      </div>
    </div>
  )
}
