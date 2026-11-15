import { notFound } from "next/navigation";
import { getInterviewById } from "@/services/interviews.actions";
import InterviewInterface from "./interview-interface";

type Props = {
  params: {
    interviewId: string;
  };
};

/**
 * The candidate's page. The link is checked on the server first, so a link to an interview
 * that does not exist (or was deleted) is answered with a real 404 instead of a normal page
 * that only says the link is invalid.
 */
export default async function CallPage({ params }: Props) {
  if (!(await getInterviewById(params.interviewId))) {
    notFound();
  }

  return <InterviewInterface params={params} />;
}
