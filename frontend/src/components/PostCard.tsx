"use client"
import { useFetchPostVerdict } from "../hooks/SovereignSpaces";
import { Community, Post } from "../lib/contract/types";

// PostCard.tsx (or inline in the same file)
export const PostCard: React.FC<{
    post: Post;
    community: Community;
    communityId: string;
    wallet?: string | null;
    isJoined: boolean;
    reportingPostId: string | null;
    isModeratingPost: boolean;
    isAppealingModeration: boolean;
    onReport: (postId: string) => void;
    onTriggerReview: (postId: string) => void;
    onNavigate: (path: string) => void;
    expandedVerdicts: Record<string, boolean>;
    onToggleVerdict: (postId: string) => void;
    moderatingPostId: string | null;
}> = ({
    post,
    community,
    communityId,
    wallet,
    isJoined,
    reportingPostId,
    isModeratingPost,
    isAppealingModeration,
    onReport,
    onTriggerReview,
    onNavigate,
    expandedVerdicts,
    onToggleVerdict,
    moderatingPostId
}) => {
        // Hook is always called (pass empty string / disabled when not needed)
        const { data: verdict } = useFetchPostVerdict(
            post.moderation_id && post.moderation_id !== "" ? post.moderation_id : ""
        );
        // Or better: make the hook accept `enabled: !!post.moderation_id` if it is based on React Query

        const isPostAuthor = wallet?.toLowerCase() === post.author.toLowerCase();
        const rCount = post.report_count;
        const isReportedThreshold = rCount >= community.report_threshold;


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
                        ) : community?.moderators?.some((m) => m.toLowerCase() === post.author.toLowerCase()) ? (
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
                                onClick={() => onReport(post.post_id)}
                                disabled={reportingPostId === post.post_id}
                                className="text-[#dc2626] uppercase hover:underline hover:bg-[#dc2626]/10 px-1.5 py-0.5"
                            >
                                {reportingPostId === post.post_id ? "Reporting..." : "Report"}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {isReportedThreshold && post.status === 'active' && (
                            <button
                                onClick={() => onTriggerReview(post.post_id)}
                                disabled={post.post_id === moderatingPostId}
                                className="border border-white text-white px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-white hover:text-black transition-colors"
                            >
                                {isModeratingPost ? "Moderaing Post..." : "Trigger Genlayer to moderate post"}
                            </button>
                        )}

                        {/* Appeal own post */}
                        {isPostAuthor && (post.status === 'hidden' || post.status === 'removed') && (
                            <button
                                onClick={() => onNavigate(`/communities/${communityId}/posts/${post.post_id}`)}
                                className="border border-white text-white px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-white hover:text-black transition-colors"
                            >
                                {isAppealingModeration ? "Appealing Decision" : "Appeal Decision"}
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
                            onClick={() => onToggleVerdict(post.post_id)}
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
    };