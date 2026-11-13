import {
  deactivateInterviewsByOrgId,
  deleteInterview,
  getAllInterviews,
  getInterviewById,
  updateInterview,
} from "./interviews.actions";

export const InterviewService = {
  getAllInterviews,
  getInterviewById,
  updateInterview,
  deleteInterview,
  deactivateInterviewsByOrgId,
};
