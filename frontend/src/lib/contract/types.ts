export interface Community {
    community_id: string
    name: string
    description: string
    constitution: string
    founder: string
    member_count: number
    post_count: number
    moderator_count: number
    report_threshold: number
    appeal_threshold: "simple" | "supermajority"
    status: "active" | "archived"
    created_at: string
    avatar_url: string
    banner_url: string
    tags: string[]
    moderators: string[]
}


export interface Membership {
    wallet: string
    community_id: string
    role: "member" | "moderator" | "founder"
    joined_at: string
    posts_count: number
    reports_filed: number
    banned: boolean
    banned_reason: string
}

export interface Post {
    post_id: string
    community_id: string
    author: string
    title: string
    content: string
    content_type: "text" | "url" | "image_url"
    status: "active" | "hidden" | "removed" | "appealing"
    report_count: number
    created_at: string
    moderation_id: string
}

export interface Report {
    report_id: string
    post_id: string
    community_id: string
    reporter: string
    reason: string
    created_at: string
}

export interface ModerationVerdict {
    moderation_id: string
    post_id: string
    community_id: string
    verdict: "violation" | "no_violation" | "inconclusive"
    rule_violated: string
    reasoning: string
    confidence: "high" | "medium" | "low"
    action_taken: "hidden" | "removed" | "cleared"
    is_appeal: boolean
    moderated_at: string
    triggered_by: string
    appeal_context: string
    
}


export interface ConstitutionAmendment {
    amendment_id: string
    community_id: string
    proposed_by: string
    old_constitution: string
    new_constitution: string
    reason: string
    votes_for: number
    votes_against: number
    status: "voting" | "passed" | "rejected"
    proposed_at: string
    resolved_at: string
    voter_wallets: string[]
}

export interface TransactionReceipt {
    status: string;
    hash: string;
    blockNumber?: number;
    [key: string]: any;
}