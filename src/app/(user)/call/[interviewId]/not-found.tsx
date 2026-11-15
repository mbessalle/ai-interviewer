import { PopUpMessage } from "./interview-interface";

/** Shown, with a 404 status, when the link does not lead to an interview. */
export default function InterviewNotFound() {
  return (
    <PopUpMessage
      title="Invalid URL"
      description="The interview link you're trying to access is invalid. Please check the URL and try again."
      image="/invalid-url.png"
    />
  );
}
