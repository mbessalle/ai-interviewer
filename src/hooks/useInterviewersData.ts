import { useQuery } from "@tanstack/react-query";
import { InterviewerService } from "@/services/interviewers.service";
import { useClerk } from "@clerk/nextjs";

export function useInterviewersData() {
  const { user, isLoaded: userLoaded } = useClerk();

  return useQuery({
    queryKey: ["interviewers", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not loaded");
      }
      
return InterviewerService.getAllInterviewers(user.id);
    },
    enabled: userLoaded && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - interviewers rarely change
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Helper hook to get interviewer by ID
export function useInterviewerById(interviewerId: bigint) {
  const { data: interviewers = [] } = useInterviewersData();

  return interviewers.find((interviewer) => interviewer.id === interviewerId);
}
