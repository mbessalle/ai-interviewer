"use client";

import React, {
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Interview } from "@/types/interview";
import { InterviewService } from "@/services/interviews.service";
import { useClerk, useOrganization } from "@clerk/nextjs";

interface InterviewContextProps {
  interviews: Interview[];
  setInterviews: React.Dispatch<React.SetStateAction<Interview[]>>;
  getInterviewById: (interviewId: string) => Interview | null | any;
  interviewsLoading: boolean;
  setInterviewsLoading: (interviewsLoading: boolean) => void;
  fetchInterviews: () => void;
}

export const InterviewContext = React.createContext<InterviewContextProps>({
  interviews: [],
  setInterviews: () => {},
  getInterviewById: () => null,
  setInterviewsLoading: () => undefined,
  interviewsLoading: false,
  fetchInterviews: () => {},
});

interface InterviewProviderProps {
  children: ReactNode;
}

export function InterviewProvider({ children }: InterviewProviderProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const { user } = useClerk();
  const { organization } = useOrganization();
  const [interviewsLoading, setInterviewsLoading] = useState(false);

  const fetchInterviews = useCallback(async () => {
    try {
      setInterviewsLoading(true);
      const response = await InterviewService.getAllInterviews(
        user?.id as string,
        organization?.id as string,
      );
      setInterviews(response);
    } catch (error) {
      console.error(error);
    } finally {
      setInterviewsLoading(false);
    }
  }, [user?.id, organization?.id]);

  const getInterviewById = useCallback(async (interviewId: string) => {
    const response = await InterviewService.getInterviewById(interviewId);

    return response;
  }, []);

  useEffect(() => {
    if (organization?.id || user?.id) {
      fetchInterviews();
    }
  }, [fetchInterviews, organization?.id, user?.id]);

  const contextValue = useMemo(
    () => ({
      interviews,
      setInterviews,
      getInterviewById,
      interviewsLoading,
      setInterviewsLoading,
      fetchInterviews,
    }),
    [interviews, getInterviewById, interviewsLoading, fetchInterviews],
  );

  return (
    <InterviewContext.Provider value={contextValue}>
      {children}
    </InterviewContext.Provider>
  );
}

export const useInterviews = () => {
  const value = useContext(InterviewContext);

  return value;
};
