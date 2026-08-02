# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
from datetime import datetime, timezone
import json


# ─── Data Structures ──────────────────────────────────────────

@allow_storage
@dataclass
class Community:
    community_id: str
    name: str
    description: str
    constitution: str           # plain English rules
    founder: str
    member_count: i32
    post_count: i32
    moderator_count: i32
    report_threshold: i32       # reports needed to trigger AI review
    appeal_threshold: str       # "simple" | "supermajority"
    status: str                 # "active" | "archived"
    created_at: str
    avatar_url: str
    banner_url: str
    tags: DynArray[str]
    moderator_wallets: DynArray[str]
    amendment_ids: DynArray[str]


@allow_storage
@dataclass
class Membership:
    wallet: str
    community_id: str
    role: str                   # "member" | "moderator" | "founder"
    joined_at: str
    posts_count: i32
    reports_filed: i32
    banned: bool
    banned_reason: str


@allow_storage
@dataclass
class Post:
    post_id: str
    community_id: str
    author: str
    title: str
    content: str                # text content or URL to content
    content_type: str           # "text" | "url" | "image_url"
    status: str                 # "active" | "hidden" | "removed" | "appealing"
    report_count: i32
    created_at: str
    moderation_id: str          # filled when moderated


@allow_storage
@dataclass
class Report:
    report_id: str
    post_id: str
    community_id: str
    reporter: str
    reason: str
    created_at: str


@allow_storage
@dataclass
class ModerationVerdict:
    moderation_id: str
    post_id: str
    community_id: str
    verdict: str                # "violation" | "no_violation" | "inconclusive"
    rule_violated: str          # which part of constitution was violated
    reasoning: str              # AI reasoning stored on-chain
    confidence: str             # "high" | "medium" | "low"
    action_taken: str           # "hidden" | "removed" | "cleared"
    is_appeal: bool
    moderated_at: str
    triggered_by: str           # wallet that triggered the moderation
    appeal_context: str


@allow_storage
@dataclass
class ConstitutionAmendment:
    amendment_id: str
    community_id: str
    proposed_by: str
    old_constitution: str
    new_constitution: str
    reason: str
    votes_for: i32
    votes_against: i32
    status: str                 # "voting" | "passed" | "rejected"
    proposed_at: str
    resolved_at: str
    voter_wallets: DynArray[str]


class SovereignSpaces(gl.Contract):

    # Communities
    communities: TreeMap[str, Community]
    community_ids: DynArray[str]
    community_counter: i32

    memberships: TreeMap[str, Membership]
    community_members: TreeMap[str, DynArray[str]]

    # Posts — keyed by post_id
    posts: TreeMap[str, Post]
    post_ids: DynArray[str]
    post_counter: i32

    # community_id -> list of post_ids
    community_posts: TreeMap[str, DynArray[str]]
    reports: TreeMap[str, Report]
    report_counter: i32

    # Track if wallet already reported a post — keyed by post_id + "|" + wallet
    has_reported: TreeMap[str, bool]

    # Moderation verdicts — keyed by moderation_id
    verdicts: TreeMap[str, ModerationVerdict]
    moderation_counter: i32

    # Constitution amendments — keyed by amendment_id
    amendments: TreeMap[str, ConstitutionAmendment]
    amendment_counter: i32

    # community_id -> active amendment_id (only one at a time)
    active_amendment: TreeMap[str, str]

    # Admin
    admin: str

    def __init__(self, admin_address: str):
        self.admin = admin_address
        self.community_counter = i32(0)
        self.post_counter = i32(0)
        self.report_counter = i32(0)
        self.moderation_counter = i32(0)
        self.amendment_counter = i32(0)

    # ─── Helpers ──────────────────────────────────────────────

    def _membership_key(self, community_id: str, wallet: str) -> str:
        return community_id + "|" + wallet

    def _report_key(self, post_id: str, wallet: str) -> str:
        return post_id + "|" + wallet

    def _is_member(self, community_id: str, wallet: str) -> bool:
        key = self._membership_key(community_id, wallet)
        return key in self.memberships and not self.memberships[key].banned

    def _is_moderator(self, community_id: str, wallet: str) -> bool:
        key = self._membership_key(community_id, wallet)
        if key not in self.memberships:
            return False
        return self.memberships[key].role in ["moderator", "founder"]

    def _is_founder(self, community_id: str, wallet: str) -> bool:
        key = self._membership_key(community_id, wallet)
        if key not in self.memberships:
            return False
        return self.memberships[key].role == "founder"

    # ─── Community Creation ───────────────────────────────────

    @gl.public.write
    def create_community(
        self,
        name: str,
        description: str,
        constitution: str,
        report_threshold: i32,
        appeal_threshold: str,
        avatar_url: str,
        banner_url: str,
        tags: list[str]
    ) -> str:
        """
        Any wallet can found a community.
        The constitution is plain English — it is what the AI
        will use to evaluate reported content.
        Write specific, testable rules for best results.
        """
        founder = str(gl.message.sender_address)

        assert len(name) >= 3, "Name must be at least 3 chars"
        assert len(name) <= 50, "Name too long"
        assert len(description) >= 10, "Description too short"
        assert len(constitution) >= 50, "Constitution must be at least 50 chars"
        assert len(constitution) <= 5000, "Constitution too long"
        assert int(report_threshold) >= 1, "Report threshold must be at least 1"
        assert appeal_threshold in ["simple", "supermajority"], "Invalid appeal threshold"

        self.community_counter += i32(1)
        community_id = f"community_{self.community_counter}"

        # Build DynArrays the same way your working contracts do
        tag_array: DynArray[str] = []
        for tag in tags[:10]:
            tag_array.append(tag)

        moderator_wallets: DynArray[str] = []
        moderator_wallets.append(founder)

        amendment_ids: DynArray[str] = []

        self.communities[community_id] = Community(
            community_id=community_id,
            name=name,
            description=description,
            constitution=constitution,
            founder=founder,
            member_count=i32(1),
            post_count=i32(0),
            moderator_count=i32(1),
            report_threshold=report_threshold,
            appeal_threshold=appeal_threshold,
            status="active",
            created_at=gl.message_raw["datetime"],
            avatar_url=avatar_url,
            banner_url=banner_url,
            tags=tag_array,
            moderator_wallets=moderator_wallets,
            amendment_ids=amendment_ids,
        )

        self.community_ids.append(community_id)

        # Same pattern that works in BetSettler / VeriFree
        self.community_posts[community_id] = []

        members: DynArray[str] = []
        members.append(founder)
        self.community_members[community_id] = members

        # Founder is automatically a member with founder role
        membership_key = self._membership_key(community_id, founder)
        self.memberships[membership_key] = Membership(
            wallet=founder,
            community_id=community_id,
            role="founder",
            joined_at=gl.message_raw["datetime"],
            posts_count=i32(0),
            reports_filed=i32(0),
            banned=False,
            banned_reason=""
        )

        return community_id

    @gl.public.write
    def update_community(
        self,
        community_id: str,
        description: str,
        avatar_url: str,
        banner_url: str
    ) -> None:
        caller = str(gl.message.sender_address)
        assert community_id in self.communities, "Community not found"
        assert self._is_founder(community_id, caller), "Only founder can update"

        if len(description) >= 10:
            self.communities[community_id].description = description
        if len(avatar_url) > 0:
            self.communities[community_id].avatar_url = avatar_url
        if len(banner_url) > 0:
            self.communities[community_id].banner_url = banner_url

    # ─── Membership ───────────────────────────────────────────

    @gl.public.write
    def join_community(self, community_id: str) -> None:
        wallet = str(gl.message.sender_address)
        assert community_id in self.communities, "Community not found"
        assert self.communities[community_id].status == "active", "Community not active"

        membership_key = self._membership_key(community_id, wallet)
        assert membership_key not in self.memberships, "Already a member"

        self.memberships[membership_key] = Membership(
            wallet=wallet,
            community_id=community_id,
            role="member",
            joined_at=gl.message_raw["datetime"],
            posts_count=i32(0),
            reports_filed=i32(0),
            banned=False,
            banned_reason=""
        )

        self.communities[community_id].member_count += i32(1)

        if community_id not in self.community_members:
            self.community_members[community_id] = []
        self.community_members[community_id].append(wallet)

    @gl.public.write
    def leave_community(self, community_id: str) -> None:
        wallet = str(gl.message.sender_address)
        membership_key = self._membership_key(community_id, wallet)
        assert membership_key in self.memberships, "Not a member"
        assert not self._is_founder(community_id, wallet), "Founder cannot leave — transfer ownership first"

        old = list(self.community_members[community_id])
        new: DynArray[str] = []
        for w in old:
            if w != wallet:
                new.append(w)
        self.community_members[community_id] = new

    @gl.public.write
    def appoint_moderator(self, community_id: str, wallet: str) -> None:
        caller = str(gl.message.sender_address)
        assert community_id in self.communities, "Community not found"
        assert self._is_founder(community_id, caller), "Only founder can appoint moderators"

        membership_key = self._membership_key(community_id, wallet)
        assert membership_key in self.memberships, "User is not a member"
        assert self.memberships[membership_key].role == "member", "Already a moderator or founder"

        self.memberships[membership_key].role = "moderator"
        self.communities[community_id].moderator_count += i32(1)
        self.communities[community_id].moderator_wallets.append(wallet)

    @gl.public.write
    def remove_moderator(self, community_id: str, wallet: str) -> None:
        caller = str(gl.message.sender_address)
        assert community_id in self.communities, "Community not found"
        assert self._is_founder(community_id, caller), "Only founder can remove moderators"

        membership_key = self._membership_key(community_id, wallet)
        assert membership_key in self.memberships, "User is not a member"
        assert self.memberships[membership_key].role == "moderator", "User is not a moderator"

        self.memberships[membership_key].role = "member"
        self.communities[community_id].moderator_count -= i32(1)

        old_mods = list(self.communities[community_id].moderator_wallets)
        new_mods: DynArray[str] = []
        for w in old_mods:
            if w != wallet:
                new_mods.append(w)
        self.communities[community_id].moderator_wallets = new_mods

    @gl.public.write
    def ban_member(self, community_id: str, wallet: str, reason: str) -> None:
        caller = str(gl.message.sender_address)
        assert community_id in self.communities, "Community not found"
        assert self._is_moderator(community_id, caller), "Only moderators can ban"

        membership_key = self._membership_key(community_id, wallet)
        assert membership_key in self.memberships, "User is not a member"
        assert not self._is_founder(community_id, wallet), "Cannot ban the founder"

        self.memberships[membership_key].banned = True
        self.memberships[membership_key].banned_reason = reason

        old = list(self.community_members[community_id])
        new: DynArray[str] = []
        for w in old:
            if w != wallet:
                new.append(w)
        self.community_members[community_id] = new

    # ─── Posting ──────────────────────────────────────────────

    @gl.public.write
    def create_post(
        self,
        community_id: str,
        title: str,
        content: str,
        content_type: str
    ) -> str:
        author = str(gl.message.sender_address)
        assert community_id in self.communities, "Community not found"
        assert self.communities[community_id].status == "active", "Community not active"
        assert self._is_member(community_id, author), "Must be a member to post"

        assert len(title) >= 3, "Title too short"
        assert len(title) <= 300, "Title too long"
        assert len(content) >= 1, "Content required"
        assert len(content) <= 10000, "Content too long"
        assert content_type in ["text", "url", "image_url"], "Invalid content type"

        self.post_counter += i32(1)
        post_id = f"post_{self.post_counter}"

        self.posts[post_id] = Post(
            post_id=post_id,
            community_id=community_id,
            author=author,
            title=title,
            content=content,
            content_type=content_type,
            status="active",
            report_count=i32(0),
            created_at=gl.message_raw["datetime"],
            moderation_id=""
        )

        self.post_ids.append(post_id)
        self.community_posts[community_id].append(post_id)

        self.communities[community_id].post_count += i32(1)

        membership_key = self._membership_key(community_id, author)
        self.memberships[membership_key].posts_count += i32(1)

        return post_id

    @gl.public.write
    def delete_own_post(self, post_id: str) -> None:
        author = str(gl.message.sender_address)
        assert post_id in self.posts, "Post not found"
        post = self.posts[post_id]
        assert post.author == author, "Not your post"
        assert post.status == "active", "Post not active"
        self.posts[post_id].status = "removed"

    # ─── Reporting ────────────────────────────────────────────

    @gl.public.write
    def report_post(self, post_id: str, reason: str) -> str:
        reporter = str(gl.message.sender_address)
        assert post_id in self.posts, "Post not found"

        post = self.posts[post_id]
        assert post.status == "active", "Post not active"
        assert post.author != reporter, "Cannot report your own post"

        community_id = post.community_id
        assert self._is_member(community_id, reporter), "Must be a member to report"

        report_key = self._report_key(post_id, reporter)
        assert report_key not in self.has_reported, "Already reported this post"

        self.report_counter += i32(1)
        report_id = f"report_{self.report_counter}"

        self.reports[report_id] = Report(
            report_id=report_id,
            post_id=post_id,
            community_id=community_id,
            reporter=reporter,
            reason=reason,
            created_at=gl.message_raw["datetime"]
        )

        self.has_reported[report_key] = True
        self.posts[post_id].report_count += i32(1)

        membership_key = self._membership_key(community_id, reporter)
        self.memberships[membership_key].reports_filed += i32(1)

        return report_id

    # ─── AI Moderation (Core GenLayer Logic) ─────────────────

    @gl.public.write
    def moderate_post(self, post_id: str) -> None:
        triggered_by = str(gl.message.sender_address)
        assert post_id in self.posts, "Post not found"

        post = self.posts[post_id]
        assert post.status == "active", "Post not eligible for moderation"

        community_id = post.community_id
        assert community_id in self.communities, "Community not found"
        community = self.communities[community_id]

        assert int(post.report_count) >= int(community.report_threshold), \
            f"Post needs {community.report_threshold} reports before moderation"

        constitution = community.constitution
        post_title = post.title
        post_content = post.content
        post_content_type = post.content_type
        community_name = community.name

        def get_verdict() -> str:
            fetched_content = ""
            if post_content_type in ["url", "image_url"] and post_content.startswith("http"):
                try:
                    response = gl.nondet.web.get(post_content)
                    fetched_content = response.body.decode("utf-8")[:3000]
                except:
                    fetched_content = post_content
            else:
                fetched_content = post_content

            prompt = f"""You are a strict content moderator for a decentralized community.

    Community: "{community_name}"

    Community Constitution (the rules):
    {constitution}

    Post Title:
    "{post_title}"

    Post Content:
    {fetched_content}

    Does this post violate any rule in the community constitution?

    Reply with ONLY one of these two words:
    violation
    no_violation

    If you are unsure, default to no_violation to protect free speech.
    Only return violation if the post clearly and obviously breaks a stated rule.
    """
            result = gl.nondet.exec_prompt(prompt).strip().lower().strip('"')
            if "no_violation" in result:
                return "no_violation"
            elif "violation" in result:
                return "violation"
            else:
                return "no_violation"

        verdict = gl.eq_principle.prompt_non_comparative(
            get_verdict,
            task="Determine if a community post violates the community constitution rules",
            criteria="Return exactly one word: violation or no_violation. Default to no_violation if uncertain."
        )
        verdict = verdict.strip().strip('"').lower()
        if "no_violation" in verdict:
            verdict = "no_violation"
        elif "violation" in verdict:
            verdict = "violation"
        else:
            verdict = "no_violation"

        # Get rule violated separately
        def get_rule_violated() -> str:
            if verdict == "no_violation":
                return ""
            prompt = f"""A post was found to violate community rules.

    Constitution: {constitution}

    Post: "{post_title}" — {post_content[:500]}

    Which specific rule was violated? Quote the exact rule in one sentence.
    Reply with ONLY the rule text, nothing else.
    """
            return gl.nondet.exec_prompt(prompt).strip()

        rule_violated = ""
        if verdict == "violation":
            rule_violated = gl.eq_principle.prompt_non_comparative(
                get_rule_violated,
                task="Identify which community rule was violated",
                criteria="Quote the specific rule that was violated. One sentence only."
            )

        # Get reasoning separately
        def get_reasoning() -> str:
            prompt = f"""A community post was evaluated and the verdict is: {verdict}

    Constitution: {constitution}
    Post: "{post_title}"

    Write one sentence explaining this moderation decision.
    Reply with ONLY the sentence.
    """
            return gl.nondet.exec_prompt(prompt).strip()

        reasoning = gl.eq_principle.prompt_non_comparative(
            get_reasoning,
            task="Explain a content moderation decision",
            criteria="One sentence explaining why the verdict was reached."
        )

        action = "removed" if verdict == "violation" else "cleared"
        confidence = "high"

        self.moderation_counter += i32(1)
        moderation_id = f"mod_{self.moderation_counter}"

        self.verdicts[moderation_id] = ModerationVerdict(
            moderation_id=moderation_id,
            post_id=post_id,
            community_id=community_id,
            verdict=verdict,
            rule_violated=rule_violated,
            reasoning=reasoning,
            confidence=confidence,
            action_taken=action,
            is_appeal=False,
            appeal_context="",
            moderated_at=gl.message_raw["datetime"],
            triggered_by=triggered_by
        )

        self.posts[post_id].moderation_id = moderation_id

        if verdict == "violation":
            self.posts[post_id].status = action
        else:
            self.posts[post_id].status = "active"

    # ─── Appeal ───────────────────────────────────────────────

    @gl.public.write
    def appeal_moderation(self, post_id: str, appeal_context: str) -> None:
        appellant = str(gl.message.sender_address)
        assert post_id in self.posts, "Post not found"

        post = self.posts[post_id]
        assert post.author == appellant, "Only the post author can appeal"
        assert post.status in ["hidden", "removed"], "Post has not been moderated"
        assert post.moderation_id != "", "No moderation record found"

        community_id = post.community_id
        community = self.communities[community_id]
        constitution = community.constitution
        post_title = post.title
        post_content = post.content
        community_name = community.name
        original_verdict = self.verdicts[post.moderation_id]
        original_reasoning = original_verdict.reasoning
        original_rule = original_verdict.rule_violated
        context = appeal_context

        self.posts[post_id].status = "appealing"

        def get_appeal_verdict() -> str:
            fetched_content = ""
            if post.content_type in ["url", "image_url"] and post_content.startswith("http"):
                try:
                    response = gl.nondet.web.get(post_content)
                    fetched_content = response.body.decode("utf-8")[:3000]
                except:
                    fetched_content = post_content
            else:
                fetched_content = post_content

            prompt = f"""You are reviewing an appeal of a content moderation decision.

    Community: "{community_name}"

    Constitution:
    {constitution}

    Post Title: "{post_title}"
    Post Content: {fetched_content}

    Original verdict: {original_verdict.verdict}
    Original rule cited: {original_rule}
    Original reasoning: {original_reasoning}

    Author's appeal:
    "{context}"

    Re-evaluate this post. Give significant benefit of the doubt to the author.
    Only uphold the removal if the violation is absolutely clear and unambiguous.
    When in doubt, side with the author and restore the post.

    Reply with ONLY one of these two words:
    violation
    no_violation
    """
            result = gl.nondet.exec_prompt(prompt).strip().lower().strip('"')
            if "no_violation" in result:
                return "no_violation"
            elif "violation" in result:
                return "violation"
            else:
                return "no_violation"

        verdict = gl.eq_principle.prompt_non_comparative(
            get_appeal_verdict,
            task="Review an appeal of a community content moderation decision",
            criteria="Return exactly one word: violation or no_violation. Give significant benefit of the doubt to the author. Default to no_violation when uncertain."
        )
        verdict = verdict.strip().strip('"').lower()
        if "no_violation" in verdict:
            verdict = "no_violation"
        elif "violation" in verdict:
            verdict = "violation"
        else:
            verdict = "no_violation"

        def get_reasoning() -> str:
            prompt = f"""An appeal of a moderation decision was reviewed. Verdict: {verdict}

    Original removal reason: {original_reasoning}
    Author's appeal: "{context}"

    Write one sentence explaining the appeal outcome.
    Reply with ONLY the sentence.
    """
            return gl.nondet.exec_prompt(prompt).strip()

        reasoning = gl.eq_principle.prompt_non_comparative(
            get_reasoning,
            task="Explain an appeal moderation outcome",
            criteria="One sentence explaining why the appeal was upheld or rejected."
        )

        action = "removed" if verdict == "violation" else "cleared"

        self.moderation_counter += i32(1)
        moderation_id = f"mod_{self.moderation_counter}"

        self.verdicts[moderation_id] = ModerationVerdict(
            moderation_id=moderation_id,
            post_id=post_id,
            community_id=community_id,
            verdict=verdict,
            rule_violated=original_rule if verdict == "violation" else "",
            reasoning=reasoning,
            confidence="high",
            action_taken=action,
            is_appeal=True,
            appeal_context=appeal_context,
            moderated_at=gl.message_raw["datetime"],
            triggered_by=appellant
        )

        self.posts[post_id].moderation_id = moderation_id

        if verdict == "violation":
            self.posts[post_id].status = action
        else:
            self.posts[post_id].status = "active"

    # ─── Moderator Manual Actions ─────────────────────────────

    @gl.public.write
    def moderator_hide_post(self, post_id: str, reason: str) -> None:
        caller = str(gl.message.sender_address)
        assert post_id in self.posts, "Post not found"
        post = self.posts[post_id]
        community_id = post.community_id
        assert self._is_moderator(community_id, caller), "Only moderators can do this"
        assert post.status == "active", "Post not active"
        self.posts[post_id].status = "hidden"

    @gl.public.write
    def moderator_restore_post(self, post_id: str) -> None:
        caller = str(gl.message.sender_address)
        assert post_id in self.posts, "Post not found"
        post = self.posts[post_id]
        community_id = post.community_id
        assert self._is_moderator(community_id, caller), "Only moderators can do this"
        assert post.status == "hidden", "Post is not hidden"
        self.posts[post_id].status = "active"

    # ─── Constitution Amendment ───────────────────────────────

    @gl.public.write
    def propose_amendment(
        self,
        community_id: str,
        new_constitution: str,
        reason: str
    ) -> str:
        proposer = str(gl.message.sender_address)
        assert community_id in self.communities, "Community not found"
        assert self._is_moderator(community_id, proposer), "Only moderators can propose amendments"
        assert len(new_constitution) >= 50, "New constitution too short"
        assert len(new_constitution) <= 5000, "New constitution too long"

        has_active = False
        if community_id in self.active_amendment:
            existing_id = self.active_amendment[community_id]
            if existing_id in self.amendments:
                if self.amendments[existing_id].status == "voting":
                    has_active = True

        assert not has_active, "Amendment already in progress"

        self.amendment_counter += i32(1)
        amendment_id = f"amend_{self.amendment_counter}"

        old_constitution = self.communities[community_id].constitution

        # Build the DynArray the same way your working contracts do
        voter_wallets: DynArray[str] = []

        self.amendments[amendment_id] = ConstitutionAmendment(
            amendment_id=amendment_id,
            community_id=community_id,
            proposed_by=proposer,
            old_constitution=old_constitution,
            new_constitution=new_constitution,
            reason=reason,
            votes_for=i32(0),
            votes_against=i32(0),
            status="voting",
            proposed_at=gl.message_raw["datetime"],
            resolved_at="",
            voter_wallets=voter_wallets
        )

        self.active_amendment[community_id] = amendment_id

        # Keep the community's amendment list in sync
        self.communities[community_id].amendment_ids.append(amendment_id)

        return amendment_id

    @gl.public.write
    def vote_on_amendment(self, amendment_id: str, vote_for: bool) -> None:
        voter = str(gl.message.sender_address)
        assert amendment_id in self.amendments, "Amendment not found"
        amend = self.amendments[amendment_id]
        assert amend.status == "voting", "Amendment not in voting phase"

        community_id = amend.community_id
        assert self._is_member(community_id, voter), "Must be a member to vote"
        assert voter not in amend.voter_wallets, "Already voted"

        self.amendments[amendment_id].voter_wallets.append(voter)

        if vote_for:
            self.amendments[amendment_id].votes_for += i32(1)
        else:
            self.amendments[amendment_id].votes_against += i32(1)

    @gl.public.write
    def resolve_amendment(self, amendment_id: str) -> None:
        caller = str(gl.message.sender_address)
        assert amendment_id in self.amendments, "Amendment not found"
        amend = self.amendments[amendment_id]
        assert amend.status == "voting", "Amendment not in voting phase"

        community_id = amend.community_id
        assert self._is_founder(community_id, caller), "Only founder can resolve"

        votes_for = int(amend.votes_for)
        votes_against = int(amend.votes_against)
        total_votes = votes_for + votes_against

        passed = total_votes > 0 and votes_for > votes_against

        self.amendments[amendment_id].status = "passed" if passed else "rejected"
        self.amendments[amendment_id].resolved_at = gl.message_raw["datetime"]

        if passed:
            self.communities[community_id].constitution = amend.new_constitution

        if community_id in self.active_amendment:
            del self.active_amendment[community_id]

    # ─── Read Methods ─────────────────────────────────────────

    @gl.public.view
    def get_community(self, community_id: str) -> Community:
        assert community_id in self.communities, "Community not found"
        return gl.storage.copy_to_memory(self.communities[community_id])

    @gl.public.view
    def get_all_communities(self) -> list[Community]:
        result = []
        for cid in self.community_ids:
            result.append(gl.storage.copy_to_memory(self.communities[cid]))
        return result

    @gl.public.view
    def get_community_posts(self, community_id: str) -> list[Post]:
        assert community_id in self.communities, "Community not found"
        result = []
        if community_id in self.community_posts:
            for pid in self.community_posts[community_id]:
                p = self.posts[pid]
                if p.status == "active":
                    result.append(gl.storage.copy_to_memory(p))
        return result

    @gl.public.view
    def get_post(self, post_id: str) -> Post:
        assert post_id in self.posts, "Post not found"
        return gl.storage.copy_to_memory(self.posts[post_id])

    @gl.public.view
    def get_moderation_verdict(self, moderation_id: str) -> ModerationVerdict:
        assert moderation_id in self.verdicts, "Verdict not found"
        return gl.storage.copy_to_memory(self.verdicts[moderation_id])

    @gl.public.view
    def get_community_members(self, community_id: str) -> list[Membership]:
        result = []
        if community_id in self.community_members:
            for wallet in self.community_members[community_id]:
                key = self._membership_key(community_id, wallet)
                if key in self.memberships:
                    result.append(gl.storage.copy_to_memory(self.memberships[key]))
        return result

    @gl.public.view
    def get_membership(self, community_id: str, wallet: str) -> Membership:
        key = self._membership_key(community_id, wallet)
        assert key in self.memberships, "Membership not found"
        return gl.storage.copy_to_memory(self.memberships[key])

    @gl.public.view
    def is_member(self, community_id: str, wallet: str) -> bool:
        return self._is_member(community_id, wallet)

    @gl.public.view
    def get_amendment(self, amendment_id: str) -> ConstitutionAmendment:
        assert amendment_id in self.amendments, "Amendment not found"
        return gl.storage.copy_to_memory(self.amendments[amendment_id])

    @gl.public.view
    def get_community_amendments(self, community_id: str) -> list[ConstitutionAmendment]:
        assert community_id in self.communities, "Community not found"
        result = []
        for aid in self.communities[community_id].amendment_ids:
            if aid in self.amendments:
                result.append(gl.storage.copy_to_memory(self.amendments[aid]))
        return result

    @gl.public.view
    def get_active_amendment(self, community_id: str) -> str:
        if community_id in self.active_amendment:
            return self.active_amendment[community_id]
        return ""

    @gl.public.view
    def get_all_user_posts(self, user_wallet: str) -> list[Post]:
        """Returns all posts authored by a specific user wallet address."""
        result: list[Post] = []
        for post_id in self.post_ids:
            if post_id in self.posts:
                post = self.posts[post_id]
                if post.author == user_wallet:
                    result.append(gl.storage.copy_to_memory(post))
        return result

    @gl.public.view
    def get_all_user_communities(self, user_wallet: str) -> list[Community]:
        """Returns all communities that a specific user wallet belongs to."""
        result: list[Community] = []
        for community_id in self.community_ids:
            if community_id in self.communities:
                key = self._membership_key(community_id, user_wallet)
                if key in self.memberships and not self.memberships[key].banned:
                    result.append(gl.storage.copy_to_memory(self.communities[community_id]))
        return result

