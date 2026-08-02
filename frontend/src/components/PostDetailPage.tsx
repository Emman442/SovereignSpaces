import React, { useState, useEffect } from 'react';
import { useWallet } from '../lib/genlayer/wallet';
import { Post, Community, ModerationVerdict } from '../lib/contract/types';
import { useAppealModerationPost, useDeleteOwnPost, useFetchCommunity, useFetchPost, useFetchPostVerdict, useModeratePost, useReportPost } from '../hooks/SovereignSpaces';

interface PostDetailPageProps {
  communityId: string;
  postId: string;
  onAddToast: (text: string, type: 'success' | 'error' | 'warning') => void;
  onNavigate: (path: string) => void;
}

export const PostDetailPage: React.FC<PostDetailPageProps> = ({
  communityId,
  postId,
  onAddToast,
  onNavigate,
}) => {
  const { address: wallet, connectWallet } = useWallet();
  const { isPending: isFetchingPost, data: post } = useFetchPost(postId)
  const { isPending: isFetchingcCommunity, data: community } = useFetchCommunity(communityId)
  const { isPending: isReportingPost, mutate: reportPost } = useReportPost()
  const { isPending: isDeletingPost, mutate: deletePost } = useDeleteOwnPost()
  const { isPending: isSubmittingAppeal, mutate: appealModerationPost } = useAppealModerationPost()
  const [isJoined, setIsJoined] = useState(false);
  const { isPending: isModeratingPost, mutate: moderatePost } = useModeratePost()


  const moderationId = post?.moderation_id ?? "";
  const { data: verdict } = useFetchPostVerdict(moderationId);


  // Form states
  const [appealText, setAppealText] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isTriggeringReview, setIsTriggeringReview] = useState(false);

  // Transaction logging states
  const [txLog, setTxLog] = useState<string | null>(null);


  if (isFetchingPost || isFetchingcCommunity) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono text-xs">
        <div className="h-4 bg-[#1a1a1a] w-32 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-10 bg-[#1a1a1a] w-3/4"></div>
            <div className="h-32 bg-[#1a1a1a] w-full"></div>
            <div className="h-20 bg-[#1a1a1a] w-full"></div>
          </div>
          <div className="lg:col-span-4 h-40 bg-[#1a1a1a]"></div>
        </div>
      </div>
    );
  }

  if (!post || !community) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center font-mono">
        <h2 className="text-white text-lg uppercase mb-4">Post not found</h2>
        <button
          onClick={() => onNavigate(`/communities/${communityId}`)}
          className="border border-white text-white px-4 py-2 uppercase text-xs font-bold hover:bg-white hover:text-black transition-colors"
        >
          Back to community
        </button>
      </div>
    );
  }

  const isAuthor = wallet?.toLowerCase() === post.author.toLowerCase();
  const reportsCount = post.report_count;
  const thresholdReached = reportsCount >= community.report_threshold;

  // Report post handler
  const handleReport = () => {
    if (!wallet) {
      onAddToast('Please connect your wallet to flag this post.', 'warning');
      connectWallet()
      return;
    }
    if (!isJoined) {
      onAddToast('You must join this community to file reports.', 'error');
      return;
    }

    reportPost({ postId: postId, reason: "" }, {
      onSuccess: () => {
        onAddToast("Post flagged successfully", "success")
      },
      onError: () => {
        onAddToast("Failed to flag post", "error")
      }
    })
  };

  // Delete post handler
  const handleDeletePost = () => {
    deletePost({ post_id: postId }, {
      onSuccess: () => {
        onAddToast("post deleted successfully", "success")
      },
      onError: () => {
        onAddToast("Failed to delete post", "success")
      }
    })
  };

  // Trigger AI Validator review
  const handleTriggerReview = () => {
    moderatePost({ post_id: postId }, {
      onSuccess: () => {
        onAddToast("Post Moderation Successfully!", "success")
      }, onError: () => {
        onAddToast("Failed to moderate post", "error")
      }
    })
  };

  // Submit appeal handler
  const handleAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealText.trim()) return;

    appealModerationPost({ post_id: postId, appeal_context: appealText }, {
      onSuccess: () => {
        onAddToast("Appeal Submited Sccessfully!", "success")
      },
      onError: () => {
        onAddToast("Failed to submit Appeal", "error")
      }
    })

  };

  return (
    <div className="bg-[#000000] text-white min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Back Link */}
      <button
        onClick={() => onNavigate(`/communities/${communityId}`)}
        className="text-xs font-mono text-[#888888] hover:text-white mb-6 uppercase tracking-wider block"
      >
        ← Back to {community.name}
      </button>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Post Content Box */}
          <div className="bg-[#0d0d0d] border border-[#222222] p-6 sm:p-8">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#888888] mb-4">
              <span
                onClick={() => onNavigate(`/profile/${post.author}`)}
                className="text-white hover:underline cursor-pointer select-all font-bold"
              >
                0x{post.author.slice(2, 6)}...{post.author.slice(-4)}
              </span>

              {/* Founder/Mod badges */}
              {post.author.toLowerCase() === community.founder.toLowerCase() ? (
                <span className="text-[10px] bg-white text-black px-1.5 py-0.5 uppercase tracking-wide font-bold">
                  FOUNDER
                </span>
              ) : community?.moderators?.some((m) => m.toLowerCase() === post.author.toLowerCase()) ? (
                <span className="text-[10px] bg-[#222222] text-white border border-[#333333] px-1.5 py-0.5 uppercase tracking-wide">
                  MODERATOR
                </span>
              ) : null}

              <span>·</span>
              <span>{new Date(post.created_at).toLocaleString()}</span>
            </div>

            {/* Post Title */}
            <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Post Body */}
            <div className="text-[#dddddd] text-sm leading-relaxed whitespace-pre-wrap font-sans mb-8">
              {post.content_type === 'url' ? (
                <div className="bg-black border border-[#222222] p-4 font-mono text-xs">
                  <span className="text-[#888888] block uppercase text-[10px] tracking-wider mb-1">
                    EMBEDDED ON-CHAIN RESOURCE LINK:
                  </span>
                  <a
                    href={post.content}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:underline break-all block font-bold text-sm"
                  >
                    {post.content} ↗
                  </a>
                </div>
              ) : post.content_type === 'image_url' ? (
                <div className="border border-[#222222] bg-black">
                  <img
                    src={post.content}
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="max-w-full h-auto mx-auto border-0"
                  />
                </div>
              ) : (
                post.content
              )}
            </div>

            {/* Delete button */}
            {isAuthor && post.status === 'active' && (
              <button
                onClick={handleDeletePost}
                className="text-xs font-mono text-[#555555] hover:text-[#dc2626] uppercase hover:bg-[#dc2626]/10 px-2 py-1 transition-all"
              >
                {!isDeletingPost ? "Delete My Post" : "Deleting Post..."}
              </button>
            )}
          </div>

          {/* Status Banners */}
          {post.status !== 'active' && (
            <div>
              {post.status === 'hidden' && (
                <div className="bg-[#d97706]/10 border border-[#d97706]/20 p-4 font-mono text-xs text-[#d97706] uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#d97706] animate-pulse"></span>
                  This post has been Hidden by consensus. Detailed validation review is in progress.
                </div>
              )}
              {post.status === 'removed' && (
                <div className="bg-[#dc2626]/10 border border-[#dc2626]/20 p-4 font-mono text-xs text-[#dc2626] uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#dc2626]"></span>
                  This post was Removed by AI Validator Consensus for violating the constitution.
                </div>
              )}
              {post.status === 'appealing' && (
                <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/20 p-4 font-mono text-xs text-[#7c3aed] uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#7c3aed] animate-pulse"></span>
                  An Appeal is in progress. Decentralized validators are currently re-evaluating the on-chain state.
                </div>
              )}
            </div>
          )}

          {/* AI Moderation Verdict Card */}
          {post.moderation_id && (
            <div className="bg-[#0d0d0d] border border-[#222222] p-6 sm:p-8 font-mono">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#222222] pb-2 mb-4">
                AI Moderation Verdict
              </h3>

              {/* Badge row */}
              <div className="flex flex-wrap gap-4 items-center mb-6">
                <div>
                  <div className="text-[10px] text-[#555555] uppercase mb-1">CONSTRUCT VERDICT</div>
                  {verdict?.verdict === 'violation' ? (
                    <span className="bg-[#dc2626] text-white px-3 py-1 font-bold text-xs uppercase select-none">
                      VIOLATION FOUND
                    </span>
                  ) : verdict?.verdict === 'no_violation' ? (
                    <span className="bg-[#16a34a] text-white px-3 py-1 font-bold text-xs uppercase select-none">
                      NO VIOLATION
                    </span>
                  ) : (
                    <span className="bg-[#d97706] text-white px-3 py-1 font-bold text-xs uppercase select-none">
                      INCONCLUSIVE
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-[10px] text-[#555555] uppercase mb-1">CONSENSUS CONFIDENCE</div>
                  <span className="text-white font-bold text-sm bg-[#111111] border border-[#222222] px-2.5 py-1">
                    {verdict?.confidence}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-[#555555] uppercase mb-1">PROTOCOL RESOLUTION</div>
                  <span className="text-white text-xs bg-[#111111] border border-[#222222] px-2.5 py-1">
                    {verdict?.action_taken}
                  </span>
                </div>
              </div>

              {/* Details list */}
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-[#555555] uppercase mb-1">RULES CITED AS VIOLATED:</div>
                  <div className="text-xs bg-[#111111] border border-[#222222] text-white p-2.5 font-bold">
                    {verdict?.rule_violated}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#555555] uppercase mb-1">DETAILED CONSENSUS REASONING:</div>
                  <div className="text-xs leading-relaxed text-[#888888] italic bg-[#111111] border border-[#222222] p-4 text-justify">
                    "{verdict?.reasoning}"
                  </div>
                </div>

                {verdict?.appeal_context && (
                  <div>
                    <div className="text-[10px] text-[#7c3aed] uppercase mb-1 font-bold">
                      AUTHOR APPEAL ARGUMENTS CITED:
                    </div>
                    <div className="text-xs leading-relaxed text-[#888888] bg-[#111111] border border-[#7c3aed]/20 p-4">
                      "{verdict.appeal_context}"
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-between pt-4 border-t border-[#1a1a1a] text-[10px] text-[#555555]">
                  <span>TRIGGERED BY: 0x{verdict?.triggered_by.slice(2, 6)}...{verdict?.triggered_by.slice(-4)}</span>
                  <span>TIME STAMPED: {new Date(verdict?.moderated_at!).toLocaleString()}</span>
                  <span>TYPE: {verdict?.is_appeal ? 'APPEAL RUN' : 'ORIGINAL FLAG RUN'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Appeal Form (Shown when hidden/removed and you are author) */}
          {isAuthor && (post.status === 'hidden' || post.status === 'removed') && (
            <div className="bg-[#0d0d0d] border border-white p-6 sm:p-8 font-sans">
              <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-white border-b border-[#222222] pb-2 mb-4">
                Appeal This Decision
              </h3>
              <p className="text-xs text-[#888888] leading-relaxed mb-4">
                As the post's author, you may request an on-chain re-evaluation. Your appeal context will be
                given to the AI validator nodes during consensus re-run.
              </p>

              <form onSubmit={handleAppeal} className="space-y-4">
                <textarea
                  required
                  rows={4}
                  placeholder="Provide additional mathematical, structural, or semantic context to prove why your post conforms to the constitution..."
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] text-sm text-white px-3 py-2 outline-none focus:border-white font-mono"
                />

                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-[10px] font-mono text-[#555555] uppercase">
                    Appeal Standard: {community.appeal_threshold === 'supermajority' ? 'Supermajority Protection active' : 'Simple Majority evaluation'}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingAppeal}
                    className="border border-white text-white hover:bg-white hover:text-black font-bold uppercase text-xs px-4 py-2 transition-colors disabled:opacity-50"
                  >
                    {isSubmittingAppeal ? 'Filing Appeal...' : 'Submit Appeal'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column (Sticky info panels) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          {/* Report Post Card */}
          {post.status === 'active' && !isAuthor && (
            <div className="bg-[#111111] border border-[#222222] p-6 font-mono">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#888888] mb-4">
                Report Post
              </h3>

              <p className="text-[11px] text-[#888888] leading-relaxed mb-4">
                If you believe this post violates the written clauses of the constitution, submit an on-chain flag.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReport}
                  disabled={isReporting}
                  className="w-full text-center bg-transparent border border-[#dc2626] text-[#dc2626] py-2 px-3 font-bold text-xs uppercase hover:bg-[#dc2626]/10 transition-colors"
                >
                  {isReporting ? 'Filing Flag...' : 'Flag Post'}
                </button>

                {/* Report counter */}
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-[10px] uppercase text-[#555555]">
                    <span>Filing Progress:</span>
                    <span className="text-white">
                      {reportsCount} of {community.report_threshold} flags
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-[#222222]">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${Math.min(100, (reportsCount / community.report_threshold) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Trigger review if threshold reached */}
              {thresholdReached && (
                <div className="mt-6 pt-6 border-t border-[#222222]">
                  <p className="text-[10px] text-[#d97706] uppercase tracking-wide mb-3 leading-relaxed">
                    ⚠️ Flag threshold reached! Consensus evaluation is ready to be executed.
                  </p>
                  <button
                    onClick={handleTriggerReview}
                    disabled={isTriggeringReview}
                    className="w-full text-center bg-white text-black py-2.5 px-3 font-bold text-xs uppercase hover:bg-[#dddddd] transition-colors"
                  >
                    {isTriggeringReview ? 'Evaluating State...' : 'Trigger AI Review'}
                  </button>
                  <span className="text-[9px] text-[#555555] block mt-1 leading-relaxed text-center uppercase">
                    Anyone can trigger review once flags reach limit.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Post Info Card */}
          <div className="bg-[#111111] border border-[#222222] p-6 font-mono text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#888888] mb-4">
              Metadata
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Status:</span>
                {post.status === 'active' && (
                  <span className="text-[#16a34a] uppercase font-bold text-[10px]">ACTIVE</span>
                )}
                {post.status === 'removed' && (
                  <span className="text-[#dc2626] uppercase font-bold text-[10px]">REMOVED</span>
                )}
                {post.status === 'hidden' && (
                  <span className="text-[#d97706] uppercase font-bold text-[10px]">HIDDEN</span>
                )}
                {post.status === 'appealing' && (
                  <span className="text-[#7c3aed] uppercase font-bold text-[10px]">APPEALING</span>
                )}
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Posted By:</span>
                <span className="text-white select-all">
                  0x{post.author.slice(2, 6)}...{post.author.slice(-4)}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Flags:</span>
                <span className="text-white">
                  {reportsCount} / {community.report_threshold}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#222222]/50">
                <span className="text-[#555555] uppercase">Community:</span>
                <span
                  onClick={() => onNavigate(`/communities/${communityId}`)}
                  className="text-white hover:underline cursor-pointer uppercase font-bold text-[10px]"
                >
                  {community.name}
                </span>
              </div>
            </div>
          </div>

          {/* Inline active transaction logger */}
          {txLog && (
            <div className="p-4 bg-[#0d0d0d] border border-white font-mono text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{txLog}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
