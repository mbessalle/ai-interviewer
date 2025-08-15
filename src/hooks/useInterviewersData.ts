import { useQuery } from "@tanstack/react-query";
import { InterviewerService } from "@/services/interviewers.service";
import { useClerk } from "@clerk/nextjs";
import { Interviewer } from "@/types/interviewer";

export function useInterviewersData() {
  // @ts-ignore - TypeScript incorrectly reports isLoaded doesn't exist on useClerk()
  const { user, isLoaded: userLoaded } = useClerk();

  return useQuery<Interviewer[]>({
    queryKey: ["interviewers", user?.id],
    queryFn: async (): Promise<Interviewer[]> => {
      if (!user?.id) {
        throw new Error("User not loaded");
      }

      return InterviewerService.getAllInterviewers(user.id);
    },
    enabled: userLoaded && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - interviewers rarely change
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Helper hook to get interviewer by ID
export function useInterviewerById(interviewerId: bigint) {
  const { data: interviewers = [] } = useInterviewersData();

  return interviewers.find((interviewer) => interviewer.id === interviewerId);
}
