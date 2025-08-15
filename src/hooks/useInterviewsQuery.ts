import { useQuery } from "@tanstack/react-query";
import { InterviewService } from "@/services/interviews.service";
import { useClerk, useOrganization } from "@clerk/nextjs";

export function useInterviewsQuery() {
  const { user, isLoaded: userLoaded } = useClerk();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  return useQuery({
    queryKey: ["interviews", user?.id, organization?.id],
    queryFn: async () => {
      if (!user?.id || !organization?.id) {
        throw new Error("User or organization not loaded");
      }
      
return InterviewService.getAllInterviews(user.id, organization.id);
    },
    enabled: userLoaded && orgLoaded && !!user?.id && !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
