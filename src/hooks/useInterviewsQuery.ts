import { useQuery } from "@tanstack/react-query";
import { InterviewService } from "@/services/interviews.service";
import { useClerk, useOrganization } from "@clerk/nextjs";
import { Interview } from "@/types/interview";

export function useInterviewsQuery() {
  // @ts-ignore - TypeScript incorrectly reports isLoaded doesn't exist on useClerk()
  const { user, isLoaded: userLoaded } = useClerk();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  return useQuery<Interview[]>({
    queryKey: ["interviews", user?.id, organization?.id],
    queryFn: async (): Promise<Interview[]> => {
      if (!user?.id || !organization?.id) {
        throw new Error("User or organization not loaded");
      }

      return InterviewService.getAllInterviews(user.id, organization.id);
    },
    enabled: userLoaded && orgLoaded && !!user?.id && !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
