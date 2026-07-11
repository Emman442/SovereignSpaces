import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext.tsx';
import { Post, Community, ModerationLog } from '../types.js';

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
  const { wallet: loggedWallet, username: loggedUsername, updateProfileName } = useWallet();

  const isOwnProfile = loggedWallet?.toLowerCase() === viewingWallet.toLowerCase();

  // Profile data state
  const [profileName, setProfileName] = useState('Anonymous');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // User activity lists
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [userLogs, setUserLogs] = useState<ModerationLog[]>([]);

  const [activeTab, setActiveTab] = useState<'posts' | 'communities' | 'history'>('posts');

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/profile/${viewingWallet}`);
      if (res.ok) {
        const data = await res.json();
        setProfileName(data.profile?.username || 'Anonymous');
        setDisplayNameInput(data.profile?.username || '');
        setUserPosts(data.posts || []);
        setUserCommunities(data.communities || []);
        setUserLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
      onAddToast('Error pulling profile activity details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [viewingWallet]);

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(viewingWallet);
    onAddToast('Wallet address copied to clipboard!', 'success');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;

    const success = await updateProfileName(displayNameInput);
    if (success) {
      setProfileName(displayNameInput);
      setIsEditing(false);
      onAddToast('Profile display name updated!', 'success');
    } else {
      onAddToast('Failed to save profile changes.', 'error');
    }
  };

  return (
    <div className="bg-[#000000] text-white min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      {/* Profile Header */}
      <div className="bg-[#0d0d0d] border border-[#222222] p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white font-mono uppercase tracking-wider">
                {isOwnProfile ? loggedUsername : profileName}
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
          Posts ({userPosts.length})
          {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>}
        </button>

        <button
          onClick={() => setActiveTab('communities')}
          className={`pb-3 text-xs font-mono uppercase font-bold tracking-wider relative transition-colors ${
            activeTab === 'communities' ? 'text-white' : 'text-[#888888] hover:text-white'
          }`}
        >
          Communities ({userCommunities.length})
          {activeTab === 'communities' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-mono uppercase font-bold tracking-wider relative transition-colors ${
            activeTab === 'history' ? 'text-white' : 'text-[#888888] hover:text-white'
          }`}
        >
          Reports & Flags ({userLogs.length})
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>}
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
              {userPosts.length === 0 ? (
                <div className="text-center py-12 text-[#555555] font-mono text-xs uppercase border border-[#222222] bg-[#0d0d0d]">
                  No posts published on-chain yet
                </div>
              ) : (
                userPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onNavigate(`/communities/${post.communityId}/posts/${post.id}`)}
                    className="bg-[#111111] border border-[#222222] p-6 hover:border-white/30 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-xs font-mono text-[#888888] mb-2">
                      <span>Community: <span className="text-white uppercase">{post.communityId}</span></span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
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
                        {post.reports.length} flags submitted by community members
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
              {userCommunities.length === 0 ? (
                <div className="md:col-span-2 text-center py-12 text-[#555555] font-mono text-xs uppercase border border-[#222222] bg-[#0d0d0d]">
                  Not a member of any communities yet
                </div>
              ) : (
                userCommunities.map((comm) => (
                  <div
                    key={comm.id}
                    className="bg-[#111111] border border-[#222222] p-6 hover:border-white/30 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <h3 className="text-lg font-bold font-mono text-white mb-1">{comm.name}</h3>
                      <p className="text-xs text-[#888888] line-clamp-1 mb-2">{comm.description}</p>
                      <span className="text-[10px] text-[#555555] font-mono">
                        {comm.memberCount} members · {comm.postCount} posts
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigate(`/communities/${comm.id}`)}
                      className="border border-white text-white text-xs font-bold font-mono px-3 py-1.5 uppercase hover:bg-white hover:text-black transition-colors"
                    >
                      Enter
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Moderation History / flags Tab */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {userLogs.length === 0 ? (
                <div className="text-center py-12 text-[#555555] font-mono text-xs uppercase border border-[#222222] bg-[#0d0d0d]">
                  No historical validator logging matching this wallet
                </div>
              ) : (
                userLogs.map((log) => (
                  <div key={log.id} className="bg-[#111111] border border-[#222222] p-5 font-mono">
                    <div className="flex justify-between items-start mb-2 text-xs text-[#888888]">
                      <span>Community: <span className="text-white uppercase">{log.communityName}</span></span>
                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-2">
                      Event on Post: "{log.postTitle}"
                    </h4>

                    {/* Verdict color code */}
                    <div className="flex gap-2 items-center text-xs mb-3">
                      <span className="text-[#555555] uppercase font-bold text-[10px]">VERDICT:</span>
                      {log.verdict === 'violation' ? (
                        <span className="text-[#dc2626] font-bold">● REJECTION - RULES VIOLATED</span>
                      ) : log.verdict === 'no_violation' ? (
                        <span className="text-[#16a34a] font-bold">● NO VIOLATION DETECTED</span>
                      ) : (
                        <span className="text-[#d97706] font-bold">● INCONCLUSIVE</span>
                      )}
                      <span className="text-[#555555]">|</span>
                      <span className="text-[#888888]">Action: {log.actionTaken}</span>
                    </div>

                    <div className="bg-[#0d0d0d] border border-[#222222] p-4 text-xs">
                      <div className="text-[9px] uppercase text-[#555555] tracking-widest mb-1 font-bold">
                        AI Reasoning output:
                      </div>
                      <p className="text-[#888888] italic leading-relaxed">
                        "{log.reasoning}"
                      </p>
                    </div>
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
