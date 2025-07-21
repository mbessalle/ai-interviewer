"use client";

import React, { useState, useContext, ReactNode, useEffect, useCallback, useMemo } from "react";
import { Interviewer } from "@/types/interviewer";
import { InterviewerService } from "@/services/interviewers.service";
import { useClerk } from "@clerk/nextjs";

interface InterviewerContextProps {
  interviewers: Interviewer[];
  setInterviewers: React.Dispatch<React.SetStateAction<Interviewer[]>>;
  createInterviewer: (payload: any) => void;
  interviewersLoading: boolean;
  setInterviewersLoading: (interviewersLoading: boolean) => void;
}

export const InterviewerContext = React.createContext<InterviewerContextProps>({
  interviewers: [],
  setInterviewers: () => {},
  createInterviewer: () => {},
  interviewersLoading: false,
  setInterviewersLoading: () => undefined,
});

interface InterviewerProviderProps {
  children: ReactNode;
}

export function InterviewerProvider({ children }: InterviewerProviderProps) {
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const { user } = useClerk();
  const [interviewersLoading, setInterviewersLoading] = useState(true);

  const fetchInterviewers = useCallback(async () => {
    try {
      setInterviewersLoading(true);
      const response = await InterviewerService.getAllInterviewers(
        user?.id as string,
      );
      setInterviewers(response);
    } catch (error) {
      console.error(error);
    } finally {
      setInterviewersLoading(false);
    }
  }, [user?.id]);

  const createInterviewer = useCallback(async (payload: any) => {
    await InterviewerService.createInterviewer({ ...payload });
    fetchInterviewers();
  }, [fetchInterviewers]);

  useEffect(() => {
    if (user?.id) {
      fetchInterviewers();
    }
  }, [fetchInterviewers, user?.id]);

  const contextValue = useMemo(() => ({
    interviewers,
    setInterviewers,
    createInterviewer,
    interviewersLoading,
    setInterviewersLoading,
  }), [interviewers, createInterviewer, interviewersLoading]);

  return (
    <InterviewerContext.Provider value={contextValue}>
      {children}
    </InterviewerContext.Provider>
  );
}

export const useInterviewers = () => {
  const value = useContext(InterviewerContext);

  return value;
};
