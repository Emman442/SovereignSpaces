import React, { useState, useEffect } from 'react';
import { useWallet } from "../lib/genlayer/wallet";
import { Post, Community } from '../lib/contract/types';
import { getAddress } from 'viem';
import { useFetchCommunities, useFetchUserCommunities, useFetchUserPosts } from '../hooks/SovereignSpaces';

interface ProfilePageProps {
  viewingWallet: string;
  onAddToast: (text: string, type: 'success' | 'error' | 'warning') => void;
  onNavigate: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  viewingWallet,
  onAddToast,
  onNavigate,
}) => {
  const { address: loggedWallet } = useWallet();

  const formattedViewingWallet = viewingWallet ? getAddress(viewingWallet) : '';
  const formattedLoggedWallet = loggedWallet ? getAddress(loggedWallet) : '';

  const targetWallet = viewingWallet ? viewingWallet.toLowerCase() : "";

  // 2. Check ownership safely
 const isOwnProfile = 
    Boolean(formattedLoggedWallet) && 
    formattedLoggedWallet === formattedViewingWallet;

  // Profile data state
  const [profileName, setProfileName] = useState('Anonymous');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const {isPending: isFetchingUserCommunities, data: userCommunities } = useFetchUserCommunities(formattedViewingWallet);
  const { isPending: isFetchingUserPosts, data: userPosts } = useFetchUserPosts(formattedViewingWallet);
    const isLoading = isFetchingUserCommunities || isFetchingUserPosts
  const [activeTab, setActiveTab] = useState<'posts' | 'communities'>('posts');

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(viewingWallet);
    onAddToast('Wallet address copied to clipboard!', 'success');
  };
  console.log(userCommunities, userPosts)
  const handleSaveProfile = async (e: React.FormEvent) => {}

  return (
    <div className="bg-[#000000] text-white min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      {/* Profile Header */}
      <div className="bg-[#0d0d0d] border border-[#222222] p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white font-mono uppercase tracking-wider">
                {isOwnProfile ? "User" : profileName}
              </h1>
              {!isOwnProfile && profileName === 'Anonymous' && (
                <span className="text-xs bg-[#222222] px-2 py-0.5 text-[#888888] font-mono">
                  UNREGISTERED ACCOUNT
                </span>
              )}
              {isOwnProfile && (
                <span className="text-xs bg-white text-black px-2 py-0.5 font-bold font-mono uppercase tracking-wide">
                  YOUR WALLET
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#888888] font-mono bg-black border border-[#222222] px-3 py-1.5 break-all max-w-xl">
              <span className="text-white">Wallet:</span>
              <span className="select-all">{viewingWallet}</span>
              <button
                onClick={handleCopyWallet}
                className="text-[#888888] hover:text-white ml-2 border-l border-[#222222] pl-2 hover:bg-[#1a1a1a] p-1 transition-colors"
                title="Copy address"
              >
                COPY
              </button>
            </div>
          </div>

          {/* Edit form */}
          {isOwnProfile && (
            <div className="w-full md:w-auto border-t border-[#222222] md:border-none pt-4 md:pt-0">
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Set display name..."
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="bg-black border border-[#222222] text-xs font-mono text-white px-3 py-1.5 focus:outline-none focus:border-white"
                  />
                  <button
                    type="submit"
                    className="bg-white text-black font-bold uppercase text-[10px] px-3 py-2 hover:bg-[#dddddd] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-[#555555] hover:text-white font-mono text-[10px] uppercase px-2 py-1"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="border border-white text-white font-bold uppercase text-[10px] px-3 py-2 hover:bg-[#1a1a1a] transition-colors font-mono tracking-wider"
                >
                  Edit Display Name
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#222222] flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-3 text-xs font-mono uppercase font-bold tracking-wider relative transition-colors ${
            activeTab === 'posts' ? 'text-white' : 'text-[#888888] hover:text-white'
          }`}
        >
          Posts ({userPosts?.length})
          {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>}
        </button>

        <button
          onClick={() => setActiveTab('communities')}
          className={`pb-3 text-xs font-mono uppercase font-bold tracking-wider relative transition-colors ${
            activeTab === 'communities' ? 'text-white' : 'text-[#888888] hover:text-white'
          }`}
        >
          Communities ({userCommunities?.length})
          {activeTab === 'communities' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>}
        </button>
      </div>

      {/* Loading Placeholders */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-24 bg-[#1a1a1a] border border-[#222222]"></div>
          <div className="h-24 bg-[#1a1a1a] border border-[#222222]"></div>
        </div>
      ) : (
        <div>
          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="flex flex-col gap-4">
              {userPosts?.length === 0 ? (
                <div className="text-center py-12 text-[#555555] font-mono text-xs uppercase border border-[#222222] bg-[#0d0d0d]">
                  No posts published on-chain yet
                </div>
              ) : (
                userPosts?.map((post) => (
                  <div
                    key={post.post_id}
                    onClick={() => onNavigate(`/communities/${post.community_id}/posts/${post.post_id}`)}
                    className="bg-[#111111] border border-[#222222] p-6 hover:border-white/30 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-xs font-mono text-[#888888] mb-2">
                      <span>Community: <span className="text-white uppercase">{post.community_id}</span></span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-bold font-mono text-white mb-2 hover:underline">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#888888] line-clamp-3 leading-relaxed mb-4">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-2">
                      {post.status === 'active' && (
                        <span className="text-[10px] font-mono text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 border border-[#16a34a]/20">
                          ACTIVE
                        </span>
                      )}
                      {post.status === 'removed' && (
                        <span className="text-[10px] font-mono text-[#dc2626] bg-[#dc2626]/10 px-2 py-0.5 border border-[#dc2626]/20">
                          REMOVED BY AI CONSENSUS
                        </span>
                      )}
                      {post.status === 'hidden' && (
                        <span className="text-[10px] font-mono text-[#d97706] bg-[#d97706]/10 px-2 py-0.5 border border-[#d97706]/20">
                          HIDDEN - UNDER REVIEW
                        </span>
                      )}
                      {post.status === 'appealing' && (
                        <span className="text-[10px] font-mono text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-0.5 border border-[#7c3aed]/20">
                          APPEAL UNDER EVALUATION
                        </span>
                      )}
                      <span className="text-xs font-mono text-[#555555]">
                        {post.report_count} flags submitted by community members
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Communities Tab */}
          {activeTab === 'communities' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userCommunities?.length === 0 ? (
                <div className="md:col-span-2 text-center py-12 text-[#555555] font-mono text-xs uppercase border border-[#222222] bg-[#0d0d0d]">
                  Not a member of any communities yet
                </div>
              ) : (
                userCommunities?.map((comm) => (
                  <div
                    key={comm.community_id}
                    className="bg-[#111111] border border-[#222222] p-6 hover:border-white/30 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <h3 className="text-lg font-bold font-mono text-white mb-1">{comm.name}</h3>
                      <p className="text-xs text-[#888888] line-clamp-1 mb-2">{comm.description}</p>
                      <span className="text-[10px] text-[#555555] font-mono">
                        {comm.member_count} members · {comm.post_count} posts
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigate(`/communities/${comm.community_id}`)}
                      className="border border-white text-white text-xs font-bold font-mono px-3 py-1.5 uppercase hover:bg-white hover:text-black transition-colors"
                    >
                      Enter
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
