
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { getContractAddress } from "../lib/genlayer/client";
import { ConstitutionAmendment, Membership, ModerationVerdict, Post, type Community} from "../lib/contract/types";
import { toast } from "sonner";
import { useWallet } from '../lib/genlayer/wallet';
import MemeArena from "../lib/contract/SovereignSpaces";


export function useSovereignSpacesContract(): MemeArena | null {
    const { address } = useWallet()
    const contractAddress = getContractAddress();
    return useMemo(() => {
        if (!contractAddress || !address) {
            return null;
        }
        return new MemeArena(contractAddress, address);
    }, [contractAddress, address]);
}




export function useFetchCommunities() {
    const contract = useSovereignSpacesContract();

    return useQuery<Community[], Error>({
        queryKey: ["communities"],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getCommunities();
        },
        enabled: !!contract,
    });
}

export function useFetchUserCommunities(wallet: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<Community[], Error>({
        queryKey: ["communities"],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getUserCommunities(wallet);
        },
        enabled: !!contract,
    });
}



export function useFetchCommunity(communityId: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<Community, Error>({
        queryKey: ["pool", communityId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getCommunity(communityId);
        },
        enabled: !!contract,
    });
}


export function useFetchCommunityMembers(communityId: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<Membership[], Error>({
        queryKey: ["community_members", communityId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getCommunityMembers(communityId);
        },
        enabled: !!contract,
    });
}

export function useFetchCommunityPosts(communityId: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<Post[], Error>({
        queryKey: ["community_posts", communityId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getCommunityPosts(communityId);
        },
        enabled: !!contract,
    });
}

export function useFetchUserPosts(wallet: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<Post[], Error>({
        queryKey: ["user_posts", wallet],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getUserPosts(wallet);
        },
        enabled: Boolean(contract && wallet),
    });
}


export function useFetchPost(postId: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<Post, Error>({
        queryKey: ["post", postId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getPost(postId);
        },
        enabled: !!contract,
    });
}




export function useFetchPostVerdict(moderationId: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<ModerationVerdict, Error>({
        queryKey: ["verdict", moderationId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getModerationVerdict(moderationId);
        },
        enabled: !!contract,
    });
}

export function useFetchCommunityAmendments(communityId: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<ConstitutionAmendment[], Error>({
        queryKey: ["community_amendments", communityId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getCommunityAmendments(communityId);
        },
        enabled: !!contract,
    });
}

export function useFetchActiveCommunityAmendment(communityId: string) {
    const contract = useSovereignSpacesContract();

    return useQuery<ConstitutionAmendment, Error>({
        queryKey: ["community_amendment", communityId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getActiveCommunityAmendment(communityId);
        },
        enabled: !!contract,
    });
}



export function useCreateCommunity() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            name, description, constitution, report_threshold, appeal_threshold, avatar_url, banner_url, tags
        }: {
            name: string,
            description: string,
            constitution: string,
            report_threshold: number,
            appeal_threshold: string,
            avatar_url: string,
            banner_url: string,
            tags: string[]
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.CreateCommunity(name, description, constitution, report_threshold, appeal_threshold, avatar_url, banner_url, tags);
            console.log("community creation transaction receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["communities"],
            });
        },
        onError: async (error) => {
            console.error("Error creating community:", error);
            throw new Error("Failed to create community.");
        }
    });
}

export function useJoinCommunity() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            communityId
        }: {
            communityId: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.JoinCommunity(communityId);
            console.log("join community tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community", variables.communityId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["community_members", variables.communityId],
            });
             await queryClient.invalidateQueries({
                queryKey: ["communities"],
            });
        },
        onError: async (error) => {
            console.error("Error Joining community:", error);
            toast.error("Failed to join commuinity.");
        }
    });
}
export function useAppointModerator() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            communityId,
            wallet
        }: {
            communityId: string
            wallet: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.appointModerator(communityId, wallet);
            console.log("moderator promotion tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community", variables.communityId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["community_members", variables.communityId],
            });
             await queryClient.invalidateQueries({
                queryKey: ["communities"],
            });
        },
        onError: async (error) => {
            console.error("Error appointing moderator:", error);
        }
    });
}

export function useRemoveModerator() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            communityId,
            wallet
        }: {
            communityId: string
            wallet: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.removeModerator(communityId, wallet);
            console.log("moderator removal tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community", variables.communityId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["community_members", variables.communityId],
            });
             await queryClient.invalidateQueries({
                queryKey: ["communities"],
            });
        },
        onError: async (error) => {
            console.error("Error demoting moderator:", error);
        }
    });
}
export function useBanMember() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            communityId,
            wallet,
            reason
        }: {
            communityId: string
            wallet: string
            reason: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.banMember(communityId, wallet, reason);
            console.log("ban member tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community", variables.communityId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["community_members", variables.communityId],
            });
             await queryClient.invalidateQueries({
                queryKey: ["communities"],
            });
        },
        onError: async (error) => {
            console.error("Error banning member:", error);
        }
    });
}
export function useLeaveCommunity() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            communityId
        }: {
            communityId: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.LeaveCommunity(communityId);
            console.log("leave community tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community", variables.communityId],
            });
        },
        onError: async (error) => {
            console.error("Error leaving community:", error);
            toast.error("Failed to leave commuinity.");
        }
    });
}
export function useReportPost() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            postId,
            reason
        }: {
            postId: string
            reason: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            const receipt = await contract.ReportPost(postId, reason);
            console.log("lreport community post tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community_posts", variables.postId],
            });
        },
        onError: async (error) => {
            console.error("Error reporting community post:", error);
            toast.error("Failed to report commuinity post.");
        }
    });
}
export function useCreatePost() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            community_id,
            title,
            content,
            content_type
        }: {
            community_id: string,
            title: string,
            content: string,
            content_type: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            const receipt = await contract.CreatePost(community_id,
                title,
                content,
                content_type);
            console.log("post creation tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community_posts", variables.community_id],
            });
            await queryClient.invalidateQueries({
                queryKey: ["community", variables.community_id],
            });
        },
        onError: async (error) => {
            console.error("Error creating community post:", error);
            toast.error("Failed to create community post.");
        }
    });
}

export function useProposeAmendment() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            community_id,
            new_constitution,
            reason,

        }: {
            community_id: string,
            new_constitution: string
            reason: string,
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            const receipt = await contract.ProposeAmendment(community_id, new_constitution, reason);
            console.log("post creation tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community_amendments", variables.community_id],
            });
        },
        onError: async (error) => {
            console.error("Error proposing amendment:", error);
            throw new Error("Failed to proposing amendment");
        }
    });
}


export function useVoteOnAmendment() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            amendment_id,
            vote_for,
            community_id

        }: {
            amendment_id: string,
            vote_for: boolean
            community_id: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            const receipt = await contract.VoteOnAmendment(amendment_id, vote_for);
            console.log("vote on amendment tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community_amendments", variables.community_id],
            });
        },
        onError: async (error) => {
            console.error("Error voting on amendment:", error);
            throw new Error("Failed to vote on amendment");
        }
    });
}

export function useResolveAmendment() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            amendment_id,
            community_id
        }: {
            amendment_id: string,
            community_id: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            const receipt = await contract.ResolveAmendment(amendment_id);
            console.log("resolve amendment tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["community_amendments", variables.community_id],
            });
        },
        onError: async (error) => {
            console.error("Error resolving amendment:", error);
            throw new Error("Failed to resolve amendment");
        }
    });
}

export function useDeleteOwnPost() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            
            post_id,
        }: {
            post_id: string,
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            const receipt = await contract.DeleteOwnPost(post_id);
            console.log("delete post tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["post", variables.post_id],
            });
            await queryClient.invalidateQueries({
                queryKey: ["community_posts"],
            });
        },
        onError: async (error) => {
            console.error("Error deleting post:", error);
            throw new Error("Failed to delete post");
        }
    });
}

export function useModeratePost() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            post_id,
        }: {
            post_id: string,
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            const receipt = await contract.ModeratePost(post_id);
            console.log("moderate post tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["post", variables.post_id],
            });
        },
        onError: async (error) => {
            console.error("Error resolving amendment:", error);
            throw new Error("Failed to resolve amendment");
        }
    });
}

export function useAppealModerationPost() {
    const contract = useSovereignSpacesContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            post_id,
            appeal_context
        }: {
            post_id: string,
            appeal_context: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            const receipt = await contract.AppealModeration(post_id, appeal_context);
            console.log("appeal moderation tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["post", variables.post_id],
            });
        },
        onError: async (error) => {
            console.error("Error appealing moderation:", error);
            throw new Error("Failed to appeal moderation");
        }
    });
}

