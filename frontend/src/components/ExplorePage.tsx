import React, { useState, useMemo } from 'react';
import { Community } from '../lib/contract/types';

interface ExplorePageProps {
  communities: Community[];
  onNavigate: (path: string) => void;
  isLoading: boolean;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ communities, onNavigate, isLoading }) => {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    communities.forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((tag) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  }, [communities]);

  // Filtered communities
  const filteredCommunities = useMemo(() => {
    return communities.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.constitution.toLowerCase().includes(search.toLowerCase());

      const matchesTag = !selectedTag || (Array.isArray(c.tags) && c.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });
  }, [communities, search, selectedTag]);

  return (
    <div className="bg-[#000000] text-white min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      {/* Page Title */}
      <h1 className="text-3xl font-bold font-mono tracking-tight uppercase text-white mb-6">
        Communities
      </h1>

      {/* Search Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111111] border border-[#222222] text-white font-mono text-sm px-4 py-3 outline-none focus:border-white transition-colors"
        />
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedTag(null)}
            className={`flex-shrink-0 text-xs font-mono px-3 py-1.5 border transition-colors ${
              selectedTag === null
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-[#888888] border-[#222222] hover:border-white hover:text-white'
            }`}
          >
            ALL TAGS
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`flex-shrink-0 text-xs font-mono px-3 py-1.5 border uppercase transition-colors ${
                selectedTag === tag
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-[#888888] border-[#222222] hover:border-white hover:text-white'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Loading Placeholders */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-[#1a1a1a] border border-[#222222]"></div>
          <div className="h-64 bg-[#1a1a1a] border border-[#222222]"></div>
          <div className="h-64 bg-[#1a1a1a] border border-[#222222]"></div>
          <div className="h-64 bg-[#1a1a1a] border border-[#222222]"></div>
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-[#222222] bg-[#0d0d0d]">
          <span className="text-[#888888] font-mono text-sm uppercase">No communities found</span>
          <p className="text-[#555555] text-xs mt-2 font-sans">
            Try adjusting your search keywords or tag filters.
          </p>
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCommunities.map((c) => (
            <div
              key={c.community_id}
              className="bg-[#111111] border border-[#222222] p-6 hover:border-white/50 transition-colors duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2
                    onClick={() => onNavigate(`/communities/${c.community_id}`)}
                    className="text-xl font-bold font-mono text-white cursor-pointer hover:underline"
                  >
                    {c.name}
                  </h2>
                </div>

                <p className="text-[#888888] text-xs mb-4 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>

                {/* Tag pills */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTag(tag);
                      }}
                      className="text-[10px] text-[#888888] border border-[#222222] px-2 py-0.5 font-mono uppercase cursor-pointer hover:border-white hover:text-white"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Stats Row */}
                <div className="text-[11px] text-[#888888] font-mono mb-4 pb-4 border-b border-[#222222]">
                  {c.member_count} members <span className="text-[#555555]">·</span> {c.post_count} posts{' '}
                  <span className="text-[#555555]">·</span> Created by{' '}
                  <span className="text-white hover:underline cursor-pointer" onClick={() => onNavigate(`/profile/${c.founder}`)}>
                    0x{c.founder.slice(2, 6)}...{c.founder.slice(-4)}
                  </span>
                </div>

                {/* Constitution block */}
                <div className="bg-[#0d0d0d] border border-[#222222] p-4 mb-4">
                  <div className="text-[9px] font-mono text-[#555555] tracking-widest uppercase mb-1">
                    CONSTITUTION
                  </div>
                  <p className="text-xs text-[#888888] font-mono italic leading-relaxed line-clamp-3">
                    "{c.constitution}"
                  </p>
                  <button
                    onClick={() => onNavigate(`/communities/${c.community_id}`)}
                    className="text-[10px] text-white font-mono uppercase mt-2 hover:underline tracking-wider font-bold block"
                  >
                    ...read full constitution
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#555555] mb-4 uppercase tracking-wide">
                  ⚠️ Posts flagged after {c.report_threshold} reports trigger decentralized AI validation
                </div>

                <button
                  onClick={() => onNavigate(`/communities/${c.community_id}`)}
                  className="w-full text-center bg-transparent border border-white text-white py-2.5 px-4 font-mono font-bold text-xs uppercase hover:bg-white hover:text-black transition-colors"
                >
                  Enter Community
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
