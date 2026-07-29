import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types"
import { parseEther, getAddress } from "viem";
import { Community, ConstitutionAmendment, Membership, ModerationVerdict, Post, TransactionReceipt } from "./types";

/**
 * MemeArena contract class for interacting with the GenLayer SovereignSpaces contract
 */

class SovereignSpaces {
    private contractAddress: `0x${string}`;
    private client: ReturnType<typeof createClient>;

    constructor(
        contractAddress: string,
        address?: string | null,
        studioUrl?: string
    ) {
        this.contractAddress = contractAddress as `0x${string}`;

        const config: any = {
            chain: studionet,
        };

        if (address) {
            config.account = address as `0x${string}`;
        }

        if (studioUrl) {
            config.endpoint = studioUrl;
        }

        this.client = createClient(config);
    }

    /**
     * Update the address used for transactions
     */
    updateAccount(address: string): void {
        const config: any = {
            chain: studionet,
            account: address as `0x${string}`,
        };

        this.client = createClient(config);
    }


    /**
     * Get a particular user profile from the contract
     * @returns a user profile object with all relevant details
     */

    async getCommunities(): Promise<Community[]> {
        try {
            const communities = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_all_communities",
            });


            return communities as Community[];
        } catch (error) {
            console.error("Error fetching communities: ", error);
            throw new Error("Failed to fetch communities");
        }
    }

    async getUserCommunities(wallet: string): Promise<Community[]> {
        try {
            const communities = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_all_user_communities",
                args: [wallet]
            });


            return communities as Community[];
        } catch (error) {
            console.error("Error fetching user communities: ", error);
            throw new Error("Failed to fetch user communities");
        }
    }

    async getCommunity(communityId: string): Promise<Community> {
        try {
            const community = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_community",
                args: [communityId]
            });


            return community as Community;
        } catch (error) {
            console.error("Error fetching community: ", error);
            throw new Error("Failed to fetch community");
        }
    }


    async getCommunityPosts(communityId: string): Promise<Post[]> {
        try {
            const posts = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_community_posts",
                args: [communityId]
            });


            return posts as Post[];
        } catch (error) {
            console.error("Error fetching community posts: ", error);
            throw new Error("Failed to fetch community posts");
        }
    }

    async getUserPosts(walletAddress: string): Promise<Post[]> {
        const formattedAddress = walletAddress ? getAddress(walletAddress) : '';
        
        try {
            const posts = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_all_user_posts",
                args: [formattedAddress]
            });


            return posts as Post[];
        } catch (error) {
            console.error("Error fetching user posts: ", error);
            throw new Error("Failed to fetch user posts");
        }
    }

    async getPost(postId: string): Promise<Post> {
        try {
            const post = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_post",
                args: [postId]
            });


            return post as unknown as Post;
        } catch (error) {
            console.error("Error fetching post: ", error);
            throw new Error("Failed to fetch post");
        }
    }

    async DeleteOwnPost(postId: string): Promise<void> {
        try {
            const post = await this.client.readContract({
                address: this.contractAddress,
                functionName: "delete_own_post",
                args: [postId]
            });


        } catch (error) {
            console.error("Error deleting post: ", error);
            throw new Error("Failed to delete");
        }
    }

    async getCommunityAmendments(communityId: string): Promise<ConstitutionAmendment[]> {
        try {
            const community_amendments = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_community_amendments",
                args: [communityId]
            });


            return community_amendments as ConstitutionAmendment[];
        } catch (error) {
            console.error("Error fetching community amendments: ", error);
            throw new Error("Failed to fetch community amendments");
        }
    }



    async getCommunityMembers(communityId: string): Promise<Membership[]> {
        try {
            const community_members = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_community_members",
                args: [communityId]
            });

            return community_members as Membership[];
        } catch (error) {
            console.error("Error fetching community members: ", error);
            throw new Error("Failed to fetch community members");
        }
    }

    async getActiveCommunityAmendment(communityId: string): Promise<ConstitutionAmendment> {
        try {
            const active_community_amendment = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_active_amendment",
                args: [communityId]
            });


            return active_community_amendment as ConstitutionAmendment;
        } catch (error) {
            console.error("Error fetching active community amendments: ", error);
            throw new Error("Failed to fetch active community amendments");
        }
    }




    async getModerationVerdict(moderationId: string): Promise<ModerationVerdict> {
        try {
            const result = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_moderation_verdict",
                args: [moderationId],
            });

            const verdict = result as unknown

            return verdict as ModerationVerdict;
        } catch (error) {
            console.error("Error fetching moderation verdict: ", error);
            throw new Error("Failed to fetch moderation verdict");
        }
    }



    async CreateCommunity(
        name: string,
        description: string,
        constitution: string,
        report_threshold: number,
        appeal_threshold: string,
        avatar_url: string,
        banner_url: string,
        tags: string[]
    ) {

        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "create_community",
                args: [name, description, constitution, report_threshold, appeal_threshold, avatar_url, banner_url, tags],
                value: BigInt(0)

            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error Creating Community:", error);
            throw new Error("Failed to create community");
        }
    }


    async CancelPolicy(
        policy_id: string
    ) {

        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "cancel_policy",
                args: [policy_id],
                value: BigInt(0)

            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error Cancelling Policy:", error);
            throw new Error("Failed to cancel policy");
        }
    }




    async JoinCommunity(
        communityId: string
    ) {

        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "join_community",
                args: [communityId],
                value: BigInt(0)

            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error joining community:", error);
            throw new Error("Failed to join community");
        }
    }
    async LeaveCommunity(
        communityId: string
    ) {

        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "leave_community",
                args: [communityId],
                value: BigInt(0)

            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error leavecommunity:", error);
            throw new Error("Failed to leave community");
        }
    }


    async ReportPost(
        postId: string,
        reason: string
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "report_post",
                args: [postId, reason],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error reporting post:", error);
            throw new Error("Failed to report post");
        }
    }

    async CreatePost(
        community_id: string,
        title: string,
        content: string,
        content_type: string
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "create_post",
                args: [community_id, title, content, content_type],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error creating post:", error);
            throw new Error("Failed create to post");
        }
    }


    async ProposeAmendment(
        community_id: string,
        new_constitution: string,
        reason: string
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "propose_amendment",
                args: [community_id, new_constitution, reason],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error proposing amendment:", error);
            throw new Error("Failed to propose amendment");
        }
    }
    async appointModerator(
        community_id: string,
        wallet: string,
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "appoint_moderator",
                args: [community_id, wallet],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error appointing moderator:", error);
            throw new Error("Failed to appoint moderator");
        }
    }
    async removeModerator(
        community_id: string,
        wallet: string,
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "remove_moderator",
                args: [community_id, wallet],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error removing moderator:", error);
            throw new Error("Failed to remove moderator");
        }
    }
    async banMember(
        community_id: string,
        wallet: string,
        reason: string
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "ban_member",
                args: [community_id, wallet, reason],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error banning member:", error);
            throw new Error("Failed to ban member");
        }
    }
    async VoteOnAmendment(
        amendment_id: string,
        vote_for: boolean
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "vote_on_amendment",
                args: [amendment_id, vote_for],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error voting on amendment:", error);
            throw new Error("Failed to vote on amendment");
        }
    }
    async ResolveAmendment(
        amendment_id: string,
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "resolve_amendment",
                args: [amendment_id],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error resolving amendment:", error);
            throw new Error("Failed to resolbe amendment");
        }
    }
    async ModeratePost(
        post_id: string,
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "moderate_post",
                args: [post_id],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
                retries: 60,
                interval: 5000,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error moderating post:", error);
            throw new Error("Failed to moderate");
        }
    }

    async AppealModeration(
        post_id: string,
        appeal_context: string
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "appeal_moderation",
                args: [post_id, appeal_context],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
                retries: 60,
                interval: 5000,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error appealing moderation:", error);
            throw new Error("Failed to appeal moderation");
        }
    }



}


export default SovereignSpaces;