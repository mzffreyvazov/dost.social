export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase'
import { Search } from 'lucide-react'
import { CategoryScroll } from '@/components/CategoryScroll'
import Link from 'next/link'
// Add these interfaces at the top of your file
interface Tag {
  id: string;
  name: string;
}

interface CommunityTag {
  tag_id: string;
  tags: Tag;
}


export default async function DiscoverPage() {
  const supabase = createAdminClient()
  // Fetch both communities and tags
  const [{ data: communities }, { data: categories }] = await Promise.all([
    supabase
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
      `).limit(100),
    supabase
      .from('tags')
      .select('*')
      .order('name')
  ])

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

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* --- TOP HERO SECTION --- */}
      <section className="flex flex-col items-center justify-center pt-8 pb-4">
        <h1 className="text-4xl font-bold text-center mb-2">Discover Communities</h1>
        <p className="text-lg text-muted-foreground text-center mb-4">
          Find groups that match your interests
        </p>
        {/* Search Bar Row */}
        <div className="flex flex-col w-full max-w-3xl gap-4">
          <div className="flex w-full gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                type="text"
                placeholder="Search interests or communities..."
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
              />
            </div>
            <button className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-colors">
              Search
            </button>
          </div>
          {/* Category Pills */}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {categoryPills.map((cat, idx) => (
              <button
                key={cat}
                className={`px-5 py-2 rounded-full border text-base font-medium transition-colors ${
                  idx === 0
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>
      {/* --- MAIN CONTENT --- */}
      <main className="py-8"> {/* Add padding here */}
        {/* --- CATEGORIES --- */}
        <section className="mb-8">
          <CategoryScroll categories={categories || []} />
        </section>

        {/* --- TABS --- */}
        <div className="border-b mb-8">
          {/* Tabs remain the same */}
          <div className="flex gap-6">
            {['All Communities', 'Trending', 'Newly Created', 'Nearby'].map((tab) => (
              <button
                key={tab}
                className={`pb-2 px-1 ${
                  tab === 'All Communities'
                    ? 'border-b-2 border-black font-medium'
                    : 'text-muted-foreground hover:text-foreground transition-colors'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* --- COMMUNITY CARDS --- Updated to use real tags */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities?.map((community) => (
            <div
              key={community.id}
              className="
                border rounded-lg p-6
                transition-transform duration-200
                hover:-translate-y-1 hover:shadow-lg
                relative z-20
              "
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-secondary rounded-lg" />
                <div>
                  <h3 className="font-semibold text-lg">{community.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{community.member_count || 0} members</span>
                    <span>•</span>
                    <span>{community.activity_level || 'New'}</span>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                {community.description}
              </p>
              {/* Tags - Now using actual tags from the database */}
              <div className="flex flex-wrap gap-2 mb-4">
              {community.community_tags?.map((tagRelation: CommunityTag) => (
                <span
                  key={tagRelation.tag_id}
                  className="px-3 py-1 bg-secondary rounded-full text-sm"
                >
                  {tagRelation.tags?.name || 'Unknown Tag'}
                </span>
              ))}
              </div>
              {/* Location and View Details */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {community.city || 'Global'}
                </span>
                <Link href={`/community/${community.id}`} className="text-primary hover:underline">
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}