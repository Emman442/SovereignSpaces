import React, { useState, useEffect } from 'react';
import { useWallet } from '../lib/genlayer/wallet.ts';
import { Community, Post, ConstitutionAmendment, Membership, ModerationVerdict } from '../lib/contract/types.ts';
import { useAppealModerationPost, useCreatePost, useFetchCommunity, useFetchCommunityAmendments, useFetchCommunityMembers, useFetchPostVerdict, useJoinCommunity, useLeaveCommunity, useModeratePost, useProposeAmendment, useReportPost, useResolveAmendment, useVoteOnAmendment } from '../hooks/SovereignSpaces.ts';

interface CommunityPageProps {
  communityId: string;
  onAddToast: (text: string, type: 'success' | 'error' | 'warning') => void;
  onNavigate: (path: string) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  communityId,
  onAddToast,
  onNavigate,
}) => {
  const { address: wallet, connectWallet } = useWallet();
  const { data: community, isPending: isFetchingCommunity } = useFetchCommunity(communityId)
  const { data: amendments } = useFetchCommunityAmendments(communityId)
  const { data: members } = useFetchCommunityMembers(communityId)
  const alreadyVotedAgainst =  false
  const alreadyVotedFor =  false
  const { isPending: isJoiningCommunity, mutate: joinCommunity } = useJoinCommunity()
  const { isPending: isleavingCommunity, mutate: leaveCommunity } = useLeaveCommunity()
  const { isPending: isReportingPost, mutate: reportPost } = useReportPost()
  const { isPending: isCreatingPost, mutate: createPost } = useCreatePost()
  const { isPending: isProposingAmendment, mutate: proposeAmendment } = useProposeAmendment()
  const { isPending: isVotingOnAmendment, mutate: voteOnAmendment } = useVoteOnAmendment()
  const { isPending: isResolvingAmendment, mutate: resolveAmendment } = useResolveAmendment()
  const { isPending: isModeratingPost, mutate: moderatePost } = useModeratePost()
  const { isPending: isAppealingModeration, mutate: appealModeration } = useAppealModerationPost()
  // Component Data States
  const [posts, setPosts] = useState<Post[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [userRole, setUserRole] = useState<'founder' | 'moderator' | 'member' | null>(null);



  // Layout Tab State
  const [activeTab, setActiveTab] = useState<'posts' | 'constitution' | 'members' | 'amendments'>('posts');

  // Create Post Form States
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [contentType, setContentType] = useState<'text' | 'url' | 'image'>('text');

  // Propose Amendment Form States
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [newConstitutionText, setNewConstitutionText] = useState('');
  const [verdict, setVerdict] = useState<ModerationVerdict>()
  // Collapsed lists/toggles
  const [expandedVerdicts, setExpandedVerdicts] = useState<Record<string, boolean>>({});
  const [expandedAmendId, setExpandedAmendId] = useState<string | null>(null);

  // Member Action Confirmation States
  const [confirmingMemberAction, setConfirmingMemberAction] = useState<{
    targetWallet: string;
    action: 'appoint_mod' | 'remove_mod' | 'ban';
    typedConfirm: string;
  } | null>(null);

  // General Transaction/Consensus progress logs
  const [pendingTxMsg, setPendingTxMsg] = useState<string | null>(null);


  if (isFetchingCommunity) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono text-xs space-y-4">
        <div className="h-10 bg-[#1a1a1a] w-1/3"></div>
        <div className="h-4 bg-[#1a1a1a] w-1/2 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-32 bg-[#111111] border border-[#222222]"></div>
            <div className="h-32 bg-[#111111] border border-[#222222]"></div>
          </div>
          <div className="lg:col-span-4 h-48 bg-[#111111] border border-[#222222]"></div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center font-mono">
        <h2 className="text-white text-lg uppercase">Community not found</h2>
        <button
          onClick={() => onNavigate('/communities')}
          className="mt-4 border border-white text-white px-4 py-2 uppercase text-xs font-bold hover:bg-white hover:text-black transition-colors"
        >
          View All Communities
        </button>
      </div>
    );
  }

  // Membership Actions: Join/Leave
  const handleJoin = async () => {
    if (!wallet) {
      onAddToast('Connect your wallet first to register membership.', 'warning');
      connectWallet()
      return;
    }
    joinCommunity({
      communityId: communityId
    }, {
      onSuccess: () => {
        onAddToast("Joined community successfully", "success")
      },
      onError: () => {
        onAddToast("Failed to join community", "error")
      }
    })
  };

  const handleLeave = async () => {
    if (!wallet) return;
    if (!window.confirm('Are you sure you want to exit this sovereign community?')) {
      return;
    }

    leaveCommunity({
      communityId: communityId
    }, {
      onSuccess: () => {
        onAddToast("You've successfully left this community", "success")
      },
      onError: () => {
        onAddToast("Failed to leave community", "error")
      }
    })


  };

  // Create Post Submit Handler
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    createPost({ community_id: communityId, title: postTitle, content: postContent, content_type: contentType }, {
      onSuccess: () => {
        onAddToast("post created successfully", "success")
      },
      onError: () => {
        onAddToast("failed to add post", "error")
      }
    })
  };

  // Report post handler
  const handleReport = async (postId: string) => {
    if (!wallet) {
      onAddToast('Please connect wallet to flag content.', 'warning');

      connectWallet()
      return;
    }
    if (!isJoined) {
      onAddToast('Only community members can file reports.', 'error');
      return;
    }
    reportPost({
      postId: postId,
      reason: "violates community standard"
    }, {
      onSuccess: () => {
        onAddToast("post reported successfully", "success")
      },
      onError: () => {
        onAddToast("failed to report post", "error")
      }
    })
  };

  // Trigger AI consensus review
  const handleTriggerReview = async (postId: string) => {
    moderatePost({post_id: postId}, {onSuccess: ()=>{
      onAddToast("Post Moderation Successfully!", "success")
    }, onError: ()=>{
      onAddToast("Failed to moderate post", "error")
    }})
  };

  // Propose Amendment
  const handleProposeAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendReason.trim() || !newConstitutionText.trim()) return;

    proposeAmendment({ community_id: communityId, new_constitution: newConstitutionText, reason: amendReason }, {

      onSuccess: () => {
        onAddToast("Your Amendment was proposed successfully", "success")
      },

      onError: () => {
        onAddToast("Failed to propose amendment", "error")
      }
    })

  };

  // Vote on Amendment
  const handleVoteAmendment = async (amendId: string, support: boolean) => {
    if (!wallet) {
      onAddToast('Please connect your wallet to cast a vote.', 'warning');
      connectWallet()
      return;
    }
    voteOnAmendment({
      amendment_id: amendId,
      vote_for: support
    }, {
      onSuccess: () => {
        onAddToast("vote successful!", "success")
      },
      onError: () => {
        onAddToast("failed to vote on amendment", "error")
      }
    })

  };

  // Resolve and Merge Constitution Amendment (Founder only)
  const handleResolveAmendment = async (amendId: string) => {
    resolveAmendment({ amendment_id: amendId }, {
      onSuccess: () => { onAddToast("Ämendment resolved successfully", "success") }, onError: () => {
        onAddToast
          ("Failed to resolve Amendment", "error")
      }
    })
  };

  // Founder moderation actions
  const handleFounderAction = async () => {
    if (!confirmingMemberAction) return;
    const { targetWallet, action, typedConfirm } = confirmingMemberAction;

    if (typedConfirm !== 'CONFIRM') {
      onAddToast('Verification text mismatch. Type CONFIRM to execute.', 'error');
      return;
    }
  };

  // Helper toggle collapsed AI verdict
  const toggleVerdictExpansion = (postId: string) => {
    setExpandedVerdicts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };


  const activeVotingAmendment = amendments?.find((a) => a.status === 'voting');

  return (
    <div className="bg-[#000000] text-white min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Community Header Banner */}
      <div className="bg-[#0d0d0d] border border-[#222222] p-6 sm:p-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white uppercase mb-2">
          {community.name}
        </h1>
        <p className="text-[#888888] text-sm max-w-3xl mb-4 leading-relaxed">{community.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {community.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-[#888888] border border-[#222222] px-2.5 py-0.5 font-mono uppercase"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Tabs + Content) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Tab Selection Row */}
          <div className="border-b border-[#222222] flex gap-4 overflow-x-auto pb-0.5 scrollbar-hide">
            {[
              { id: 'posts', label: 'Posts' },
              { id: 'constitution', label: 'Constitution' },
              { id: 'members', label: 'Members' },
              { id: 'logs', label: 'Moderation Log' },
              { id: 'amendments', label: 'Amendments' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-xs font-mono uppercase font-bold tracking-wider relative transition-colors flex-shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-[#888888] hover:text-white'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>}
              </button>
            ))}
          </div>

          {/* Active Tab rendering */}

          {/* Tab 1: Posts */}
          {activeTab === 'posts' && (
            <div className="flex flex-col gap-4">
              {/* Expand Create Post form */}
              {isJoined && (
                <div>
                  {!showCreateForm ? (
                    <button
                      onClick={() => {
                        setShowCreateForm(true);
                        setNewConstitutionText(community.constitution);
                      }}
                      className="bg-white text-black font-bold uppercase tracking-wider text-xs px-4 py-2.5 hover:bg-[#dddddd] transition-colors font-mono"
                    >
                      + Create Post
                    </button>
                  ) : (
                    <form
                      onSubmit={handleCreatePost}
                      className="bg-[#111111] border border-[#222222] p-6 flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-center border-b border-[#222222] pb-2">
                        <span className="text-xs font-bold font-mono uppercase tracking-wide text-white">
                          Draft On-Chain Post
                        </span>
                        <div className="flex gap-2">
                          {['text', 'url', 'image'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setContentType(type as any)}
                              className={`text-[9px] font-mono px-2 py-0.5 border uppercase ${contentType === type
                                ? 'bg-white text-black border-white'
                                : 'bg-transparent text-[#888888] border-[#222222] hover:border-white'
                                }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-mono text-[#888888] uppercase mb-1">
                            Post Title
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="State your thesis clearly..."
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            className="w-full bg-[#0d0d0d] border border-[#222222] font-mono text-white text-xs px-3 py-2 outline-none focus:border-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-[#888888] uppercase mb-1">
                            {contentType === 'text'
                              ? 'Post Body'
                              : contentType === 'url'
                                ? 'Resource URL'
                                : 'Direct Image Link (URL)'}
                          </label>
                          <textarea
                            required
                            rows={contentType === 'text' ? 5 : 2}
                            placeholder={
                              contentType === 'text'
                                ? 'Write content here...'
                                : 'https://...'
                            }
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            className="w-full bg-[#0d0d0d] border border-[#222222] text-white text-xs px-3 py-2 outline-none focus:border-white font-sans"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 text-xs font-mono">
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="text-[#888888] hover:text-white px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingPost}
                          className="bg-white text-black font-bold uppercase px-4 py-1.5 hover:bg-[#dddddd]"
                        >
                          {isCreatingPost ? 'Broadcasting...' : 'Post'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* List Posts */}
              {posts.length === 0 ? (
                <div className="text-center py-16 text-[#555555] font-mono text-xs uppercase border border-[#222222] bg-[#111111]">
                  No posts published on-chain yet
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {posts.map((post) => {
                    const isPostAuthor = wallet?.toLowerCase() === post.author.toLowerCase();
                    const rCount = post.report_count;
                    const isReportedThreshold = rCount >= community.report_threshold;
                    if (post.moderation_id && post.moderation_id !== "") {
                      const { data: verdict } = useFetchPostVerdict(post.moderation_id)
                      setVerdict(verdict)
                    }
                    return (
                      <div key={post.post_id} className="bg-[#111111] border border-[#222222] p-5">
                        {/* Header info */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#888888] mb-3 border-b border-[#1a1a1a] pb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              onClick={() => onNavigate(`/profile/${post.author}`)}
                              className="text-white hover:underline cursor-pointer font-bold select-all"
                            >
                              0x{post.author.slice(2, 6)}...{post.author.slice(-4)}
                            </span>

                            {/* badges */}
                            {post.author.toLowerCase() === community.founder.toLowerCase() ? (
                              <span className="text-[9px] bg-white text-black px-1 py-0.2 uppercase font-bold tracking-wider">
                                Founder
                              </span>
                            ) : community.moderators.some((m) => m.toLowerCase() === post.author.toLowerCase()) ? (
                              <span className="text-[9px] bg-[#222222] text-white px-1 py-0.2 uppercase">
                                Moderator
                              </span>
                            ) : null}

                            <span>·</span>
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>

                          <div className="text-xs">
                            {post.status === 'active' && (
                              <span className="text-[#16a34a] font-bold text-[10px]">● ACTIVE</span>
                            )}
                            {post.status === 'removed' && (
                              <span className="text-[#dc2626] font-bold text-[10px]">❌ REMOVED</span>
                            )}
                            {post.status === 'hidden' && (
                              <span className="text-[#d97706] font-bold text-[10px]">⚠️ HIDDEN</span>
                            )}
                            {post.status === 'appealing' && (
                              <span className="text-[#7c3aed] font-bold text-[10px]">🟣 APPEALING</span>
                            )}
                          </div>
                        </div>

                        {/* Title & snippet */}
                        <h3
                          onClick={() => onNavigate(`/communities/${communityId}/posts/${post.post_id}`)}
                          className="text-lg font-bold font-mono text-white mb-2 cursor-pointer hover:underline"
                        >
                          {post.title}
                        </h3>

                        {/* Truncated block depending on status */}
                        {post.status === 'removed' ? (
                          <p className="text-xs text-[#555555] italic">
                            [Content removed by decentralized AI consensus for constitution violation]
                          </p>
                        ) : (
                          <div className="text-xs text-[#888888] line-clamp-3 leading-relaxed mb-4">
                            {post.content_type === 'url' ? (
                              <a
                                href={post.content}
                                target="_blank"
                                rel="noreferrer"
                                className="text-white hover:underline font-mono"
                              >
                                View Embedded Resource Link: {post.content} ↗
                              </a>
                            ) : (
                              post.content
                            )}
                          </div>
                        )}

                        {/* Card footer */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[#1a1a1a] text-xs font-mono text-[#888888]">
                          <div className="flex items-center gap-4">
                            <span className="text-[#555555]">{rCount} member flags</span>

                            {post.status === 'active' && !isPostAuthor && isJoined && (
                              <button
                                onClick={() => handleReport(post.post_id)}
                                className="text-[#dc2626] uppercase hover:underline hover:bg-[#dc2626]/10 px-1.5 py-0.5"
                              >
                                {isReportingPost ? "Reporting..." : "Report"}
                              </button>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {isReportedThreshold && post.status === 'active' && (
                              <button
                                onClick={() => handleTriggerReview(post.post_id)}
                                className="border border-white text-white px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-white hover:text-black transition-colors"
                              >
                                {isModeratingPost? "Moderaing Post...": "Trigger Genlayer AI to moderate post"}
                              </button>
                            )}

                            {/* Appeal own post */}
                            {isPostAuthor && (post.status === 'hidden' || post.status === 'removed') && (
                              <button
                                onClick={() => onNavigate(`/communities/${communityId}/posts/${post.post_id}`)}
                                className="border border-white text-white px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-white hover:text-black transition-colors"
                              >
                                Appeal Decision
                              </button>
                            )}

                            <button
                              onClick={() => onNavigate(`/communities/${communityId}/posts/${post.post_id}`)}
                              className="text-[#888888] hover:text-white uppercase hover:underline"
                            >
                              Full Thread →
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Verdict inline preview */}
                        {verdict && (
                          <div className="mt-4 pt-3 border-t border-[#1a1a1a]">
                            <button
                              onClick={() => toggleVerdictExpansion(post.post_id)}
                              className="text-[10px] text-white font-mono uppercase tracking-wider hover:underline"
                            >
                              {expandedVerdicts[post.post_id] ? '▼ Hide AI Verdict reasoning' : '▶ View AI Verdict reasoning'}
                            </button>

                            {expandedVerdicts[post.post_id] && (
                              <div className="mt-3 bg-[#0d0d0d] border border-[#222222] p-4 font-mono text-xs text-[#888888]">
                                <div className="flex justify-between items-center mb-2 flex-wrap gap-2 pb-1 border-b border-[#222222]">
                                  <span className="font-bold text-white uppercase text-[10px]">
                                    AI RULING OUTCOME
                                  </span>
                                  {verdict?.verdict === 'violation' ? (
                                    <span className="text-[#dc2626] font-bold">REJECTION</span>
                                  ) : verdict?.verdict === 'no_violation' ? (
                                    <span className="text-[#16a34a] font-bold">CLEARED</span>
                                  ) : (
                                    <span className="text-[#d97706] font-bold">INCONCLUSIVE</span>
                                  )}
                                </div>
                                <div className="mb-2">
                                  <span className="text-[10px] text-white uppercase block mb-0.5">
                                    CITED VIOLATIONS:
                                  </span>
                                  <span className="text-white bg-[#111111] px-1.5 py-0.5 border border-[#222222] font-bold">
                                    {verdict.rule_violated}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-white uppercase block mb-0.5 font-bold">
                                    DECISION EXPLANATION:
                                  </span>
                                  <p className="italic leading-relaxed text-justify">
                                    "{verdict.reasoning}"
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Constitution */}
          {activeTab === 'constitution' && (
            <div className="space-y-6">
              {/* Full Monospace Constitution Block */}
              <div className="constitution-block p-6 sm:p-8 font-mono leading-relaxed text-xs">
                <pre className="whitespace-pre-wrap">{community.constitution}</pre>
              </div>

              {/* Propose Amendment (Mods/Founder only) */}
              {(userRole === 'founder' || userRole === 'moderator') && (
                <div>
                  {!showAmendmentForm ? (
                    <button
                      onClick={() => {
                        setShowAmendmentForm(true);
                        setNewConstitutionText(community.constitution);
                      }}
                      className="border border-white text-white font-bold uppercase tracking-wider text-xs px-4 py-2 hover:bg-white hover:text-black transition-colors"
                    >
                      Propose Amendment
                    </button>
                  ) : (
                    <form
                      onSubmit={handleProposeAmendment}
                      className="bg-[#111111] border border-white p-6 flex flex-col gap-4 font-mono text-xs"
                    >
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#222222] pb-2">
                        Draft Constitution Amendment
                      </h3>

                      <div>
                        <label className="block text-[10px] uppercase text-[#888888] mb-1">
                          Reason for Amendment (Short text)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Expand discourse limits to include MEV-boost relays..."
                          value={amendReason}
                          onChange={(e) => setAmendReason(e.target.value)}
                          className="w-full bg-black border border-[#222222] text-white text-xs px-3 py-2 outline-none focus:border-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-[#888888] mb-1">
                          Target Constitution (Modified Text)
                        </label>
                        <textarea
                          required
                          rows={15}
                          value={newConstitutionText}
                          onChange={(e) => setNewConstitutionText(e.target.value)}
                          className="w-full bg-black border border-[#222222] text-white text-xs p-3 outline-none focus:border-white font-mono resize-y leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAmendmentForm(false)}
                          className="text-[#888888] hover:text-white px-3 py-1.5 uppercase font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isProposingAmendment}
                          className="bg-white text-black font-bold uppercase px-4 py-1.5 hover:bg-[#dddddd]"
                        >
                          {isProposingAmendment ? 'Broadcasting...' : 'Publish Proposal'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Past Amendment History */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#888888] border-b border-[#222222] pb-2">
                  Amendment Logs & Updates
                </h3>

                {amendments?.length === 0 ? (
                  <p className="text-xs font-mono text-[#555555] italic">No historic amendment revisions</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {amendments?.map((amend) => (
                      <div
                        key={amend.amendment_id}
                        className="bg-[#111111] border border-[#222222] p-4 text-xs font-mono"
                      >
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div className="text-[10px] text-[#888888]">
                            {new Date(amend?.proposed_at).toLocaleDateString()} · Proposed by 0x
                            {amend.proposed_by.slice(2, 6)}
                          </div>
                          <div>
                            {amend.status === 'passed' ? (
                              <span className="text-[#16a34a] font-bold text-[10px]">● PASSED</span>
                            ) : amend.status === 'rejected' ? (
                              <span className="text-[#dc2626] font-bold text-[10px]">● REJECTED</span>
                            ) : (
                              <span className="text-[#d97706] font-bold text-[10px] animate-pulse">
                                ● VOTING ACTIVE
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-white font-bold mt-2 text-xs">Reason: {amend.reason}</p>

                        <button
                          onClick={() => setExpandedAmendId(expandedAmendId === amend.amendment_id ? null : amend.amendment_id)}
                          className="text-[#888888] hover:text-white mt-3 text-[10px] uppercase font-bold tracking-wide hover:underline block"
                        >
                          {expandedAmendId === amend.amendment_id ? '▼ Hide Diff' : '▶ Show Constitution Diff'}
                        </button>

                        {expandedAmendId === amend.amendment_id && (
                          <div className="mt-3 border-t border-[#222222] pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                            <div>
                              <span className="text-[#555555] uppercase block mb-1">OLD constitution:</span>
                              <pre className="bg-[#0d0d0d] border border-[#222222] p-2 overflow-x-auto whitespace-pre-wrap max-h-48">
                                {amend.old_constitution}
                              </pre>
                            </div>
                            <div>
                              <span className="text-white font-bold uppercase block mb-1">PROPOSED revision:</span>
                              <pre className="bg-black border border-white/20 p-2 overflow-x-auto whitespace-pre-wrap max-h-48 text-[#dddddd]">
                                {amend.new_constitution}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Members */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#888888] border-b border-[#222222] pb-2">
                Sovereign Members Registry
              </h3>

              <div className="border border-[#222222] bg-[#0d0d0d] font-mono text-xs overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#222222] text-[#555555] uppercase text-[10px]">
                      <th className="p-3">Role</th>
                      <th className="p-3">Wallet Address</th>
                      <th className="p-3">Joined Date</th>
                      <th className="p-3">Posts</th>
                      {userRole === 'founder' && <th className="p-3 text-right">Directives</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sort by roles (founder -> moderator -> member) */}
                    {(members??[])
                      .sort((a, b) => {
                        const rank: Record<string, number> = { founder: 3, moderator: 2, member: 1 };
                        return (rank[b.role] || 0) - (rank[a.role] || 0);
                      })
                      .map((mem) => {
                        const isSelf = wallet?.toLowerCase() === mem.wallet.toLowerCase();
                        return (
                          <tr key={mem.wallet} className="border-b border-[#222222]/50 hover:bg-[#111111]/40">
                            <td className="p-3">
                              {mem.role === 'founder' ? (
                                <span className="bg-white text-black px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                  Founder
                                </span>
                              ) : mem.role === 'moderator' ? (
                                <span className="bg-[#222222] text-white border border-[#333333] px-1.5 py-0.5 text-[9px] uppercase">
                                  Moderator
                                </span>
                              ) : (
                                <span className="text-[#555555]">Member</span>
                              )}
                            </td>
                            <td className="p-3 font-bold break-all select-all">
                              {isSelf ? (
                                <span className="text-[#16a34a] font-bold">0x{mem.wallet.slice(2, 6)}...{mem.wallet.slice(-4)} (You)</span>
                              ) : (
                                <span onClick={() => onNavigate(`/profile/${mem.wallet}`)} className="hover:underline cursor-pointer">
                                  0x{mem.wallet.slice(2, 6)}...{mem.wallet.slice(-4)}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-[#888888]">
                              {new Date(mem.joined_at).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-[#888888]">{mem.posts_count}</td>

                            {/* Founder admin actions */}
                            {userRole === 'founder' && (
                              <td className="p-3 text-right">
                                {mem.role !== 'founder' && (
                                  <div className="flex justify-end gap-2 text-[10px]">
                                    {mem.role === 'moderator' ? (
                                      <button
                                        onClick={() =>
                                          setConfirmingMemberAction({
                                            targetWallet: mem.wallet,
                                            action: 'remove_mod',
                                            typedConfirm: '',
                                          })
                                        }
                                        className="text-[#888888] hover:text-white uppercase font-bold"
                                      >
                                        Demote
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setConfirmingMemberAction({
                                            targetWallet: mem.wallet,
                                            action: 'appoint_mod',
                                            typedConfirm: '',
                                          })
                                        }
                                        className="text-[#888888] hover:text-white uppercase font-bold"
                                      >
                                        Promote Mod
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        setConfirmingMemberAction({
                                          targetWallet: mem.wallet,
                                          action: 'ban',
                                          typedConfirm: '',
                                        })
                                      }
                                      className="text-[#dc2626] hover:underline uppercase font-bold"
                                    >
                                      Ban
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Founder confirmation Modal/expansion */}
              {confirmingMemberAction && (
                <div className="bg-[#111111] border border-white p-6 font-mono text-xs">
                  <h4 className="font-bold text-white uppercase text-xs mb-2 text-[#dc2626]">
                    CRITICAL: Administrative Directive Confirmation Needed
                  </h4>
                  <p className="text-[#888888] leading-relaxed mb-4">
                    You are executing a permanent on-chain state modify action:
                    <br />
                    <span className="text-white font-bold">
                      {confirmingMemberAction.action.replace('_', ' ').toUpperCase()}
                    </span>{' '}
                    target wallet: <span className="text-white select-all">{confirmingMemberAction.targetWallet}</span>
                  </p>

                  <div className="flex flex-col gap-3 max-w-md">
                    <div>
                      <label className="block text-[10px] text-[#555555] uppercase mb-1">
                        Type CONFIRM to proceed:
                      </label>
                      <input
                        type="text"
                        placeholder="CONFIRM"
                        value={confirmingMemberAction.typedConfirm}
                        onChange={(e) =>
                          setConfirmingMemberAction({
                            ...confirmingMemberAction,
                            typedConfirm: e.target.value,
                          })
                        }
                        className="bg-black border border-[#222222] text-white px-3 py-1.5 focus:border-white focus:outline-none uppercase w-full"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleFounderAction}
                        className="bg-white text-black font-bold uppercase py-2 px-4 hover:bg-[#dddddd]"
                      >
                        Execute Directive
                      </button>
                      <button
                        onClick={() => setConfirmingMemberAction(null)}
                        className="text-[#888888] hover:text-white uppercase font-bold py-2 px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Tab 5: Amendments */}
          {activeTab === 'amendments' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#888888] border-b border-[#222222] pb-2">
                Active Constitution Amendment Protocols
              </h3>

              {amendments?.length === 0 ? (
                <div className="text-center py-16 text-[#555555] font-mono text-xs uppercase border border-[#222222] bg-[#111111]">
                  No amendments registered on-chain yet
                </div>
              ) : (
                <div className="flex flex-col gap-4 font-mono text-xs">
                  {amendments?.map((amend) => {
                    const yesCount = amend.votes_for;
                    const noCount = amend.votes_against;

                    return (
                      <div key={amend.amendment_id} className="bg-[#111111] border border-[#222222] p-6">
                        {/* Header */}
                        <div className="flex justify-between items-start flex-wrap gap-2 mb-4 border-b border-[#222222] pb-3 text-xs">
                          <div>
                            <div className="text-[#888888] text-[10px]">
                              PROPOSED BY: 0x{amend.proposed_by.slice(2, 6)}...{amend.proposed_by.slice(-4)}
                            </div>
                            <h4 className="text-white font-bold mt-1">Reason: {amend.reason}</h4>
                          </div>

                          <div>
                            {amend.status === 'voting' ? (
                              <span className="bg-[#d97706]/10 text-[#d97706] border border-[#d97706]/20 px-2 py-0.5 uppercase tracking-wider font-bold animate-pulse text-[10px]">
                                VOTING ACTIVE
                              </span>
                            ) : amend.status === 'passed' ? (
                              <span className="bg-[#16a34a]/10 text-[#16a34a] border border-[#16a34a]/20 px-2 py-0.5 uppercase tracking-wider font-bold text-[10px]">
                                PASSED & MERGED
                              </span>
                            ) : (
                              <span className="bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 px-2 py-0.5 uppercase tracking-wider font-bold text-[10px]">
                                REJECTED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Votes metrics */}
                        <div className="flex items-center gap-6 text-sm mb-6 bg-[#0d0d0d] p-3 border border-[#222222]/50">
                          <div>
                            <span className="text-[#555555] uppercase text-[10px] block">YES Votes:</span>
                            <span className="text-[#16a34a] font-bold text-lg">{yesCount}</span>
                          </div>
                          <div className="border-l border-[#222222] h-8"></div>
                          <div>
                            <span className="text-[#555555] uppercase text-[10px] block">NO Votes:</span>
                            <span className="text-[#dc2626] font-bold text-lg">{noCount}</span>
                          </div>
                        </div>

                        {/* Voting interactions */}
                        {amend.status === 'voting' && (
                          <div className="flex flex-wrap gap-4 justify-between items-center pt-4 border-t border-[#1a1a1a]">
                            {/* Member voting buttons */}
                            {isJoined ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleVoteAmendment(amend.amendment_id, true)}
                                  disabled={isVotingOnAmendment}
                                  className={`px-3 py-1.5 uppercase font-bold text-xs border ${alreadyVotedFor
                                    ? 'bg-[#16a34a] text-white border-[#16a34a]'
                                    : 'bg-transparent text-white border-[#222222] hover:border-white'
                                    }`}
                                >
                                  {'Vote For'}
                                </button>
                                <button
                                  onClick={() => handleVoteAmendment(amend.amendment_id, false)}
                                  disabled={isVotingOnAmendment}
                                  className={`px-3 py-1.5 uppercase font-bold text-xs border ${alreadyVotedAgainst
                                    ? 'bg-[#dc2626] text-white border-[#dc2626]'
                                    : 'bg-transparent text-white border-[#222222] hover:border-white'
                                    }`}
                                >
                                  { 'Vote Against'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#555555] uppercase">
                                Connect & join to cast votes on proposals.
                              </span>
                            )}

                            {/* Founder Resolve button */}
                            {userRole === 'founder' && (
                              <button
                                onClick={() => handleResolveAmendment(amend.amendment_id)}
                                disabled={isResolvingAmendment}
                                className="bg-white text-black font-bold uppercase text-xs px-4 py-2 hover:bg-[#dddddd] transition-colors"
                              >
                               {isResolvingAmendment? "Resolvong Amendment...":"Resolve & Tally Amendment"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Sticky Side Panel) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          {/* Membership status card */}
          <div className="bg-[#111111] border border-[#222222] p-6 font-mono text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#888888] mb-4">
              Membership Gate
            </h3>

            {!wallet ? (
              <div className="space-y-4">
                <p className="text-[#888888] leading-relaxed">
                  Connect your decentralized wallet to register membership and participate in governance rules.
                </p>
                <button
                  onClick={connectWallet}
                  className="w-full text-center bg-white text-black py-2.5 px-4 font-bold text-xs uppercase hover:bg-[#dddddd] transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            ) : !isJoined ? (
              <div className="space-y-4">
                <p className="text-[#888888] leading-relaxed">
                  You are not registered in this community. Join to publish threads, report violations, and vote
                  on amendments.
                </p>
                <button
                  onClick={handleJoin}
                  disabled={isJoiningCommunity}
                  className="w-full text-center bg-white text-black py-2.5 px-4 font-bold text-xs uppercase hover:bg-[#dddddd] transition-colors"
                >
                  {isJoiningCommunity ? "Joining Community..." : "Join Community"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[#16a34a] font-bold uppercase tracking-wider flex items-center gap-1.5 text-sm">
                  <span>✓</span> You are a registered member
                </p>

                <div className="bg-[#0d0d0d] border border-[#222222] p-3 text-xs text-[#888888] space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Your Role:</span>
                    <span className="text-white uppercase font-bold text-[10px] bg-[#222222] px-1.5 py-0.5">
                      {userRole}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Joined Date:</span>
                    <span className="text-white">Active</span>
                  </div>
                </div>

                {userRole !== 'founder' && (
                  <button
                    onClick={handleLeave}
                    disabled={isleavingCommunity}
                    className="text-[#888888] hover:text-[#dc2626] font-mono text-[10px] uppercase hover:underline block text-center w-full"
                  >
                    {isleavingCommunity ? "Leaving Community..." : "Leave Community"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Community Metadata Card */}
          <div className="bg-[#111111] border border-[#222222] p-6 font-mono text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#888888] mb-4">
              Community Metadata
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Total Members:</span>
                <span className="text-white font-bold">{community.member_count}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Total Threads:</span>
                <span className="text-white font-bold">{community.post_count}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Validator Node Threshold:</span>
                <span className="text-white font-bold">{community.report_threshold} flags</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Appeal Standard:</span>
                <span className="text-white font-bold uppercase text-[10px]">
                  {community.appeal_threshold} majority
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Founded On-Chain:</span>
                <span className="text-white">
                  {new Date(community.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Active Amendment Alert card */}
          {activeVotingAmendment && (
            <div className="bg-[#111111] border border-[#d97706]/40 p-5 font-mono text-xs text-[#d97706] tracking-wider space-y-3">
              <div className="font-bold uppercase text-[10px] flex items-center gap-1.5 text-white">
                <span className="h-2 w-2 rounded-full bg-[#d97706] animate-pulse"></span>
                CONSTITUTION VOTE ACTIVE
              </div>
              <p className="text-xs text-[#888888] leading-relaxed">
                A proposal has been filed to update the plain English constitution rules.
              </p>
              <button
                onClick={() => {
                  setActiveTab('amendments');
                  setExpandedAmendId(activeVotingAmendment.amendment_id);
                }}
                className="text-white text-xs border-b border-white hover:text-white/80 transition-colors uppercase font-bold"
              >
                Go to Amendments tab →
              </button>
            </div>
          )}

          {/* Active transaction states */}
          {pendingTxMsg && (
            <div className="p-4 bg-[#0d0d0d] border border-white font-mono text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{pendingTxMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
