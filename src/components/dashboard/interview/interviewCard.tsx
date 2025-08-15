import React, { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, ArrowUpRight } from "lucide-react";
import { CopyCheck } from "lucide-react";
import { ResponseService } from "@/services/responses.service";
import axios from "axios";
import MiniLoader from "@/components/loaders/mini-loader/miniLoader";
import { useInterviewerById } from "@/hooks/useInterviewersData";

interface Props {
  name: string | null;
  interviewerId: bigint;
  id: string;
  url: string;
  readableSlug: string;
}

const base_url = process.env.NEXT_PUBLIC_LIVE_URL;

function InterviewCard({ name, interviewerId, id, url, readableSlug }: Props) {
  const [copied, setCopied] = useState(false);
  const [responseCount, setResponseCount] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Get interviewer data from shared hook - no individual API calls
  const interviewer = useInterviewerById(interviewerId);
  const img = interviewer?.image || "/AI-Interviewer.jpg"; // Default fallback

  const fetchResponses = useCallback(async () => {
    try {
      const responses = await ResponseService.getAllResponses(id);
      setResponseCount(responses.length);

      if (responses.length > 0) {
        setIsFetching(true);

        // Process unanalyzed responses in parallel instead of sequentially
        const unanalyzedResponses = responses.filter(
          (response) => !response.is_analysed,
        );

        if (unanalyzedResponses.length > 0) {
          const promises = unanalyzedResponses.map((response) =>
            axios
              .post("/api/get-call", { id: response.call_id })
              .catch((error) => {
                console.error(
                  `Failed to call api/get-call for response id ${response.call_id}:`,
                  error,
                );
              }),
          );

          await Promise.allSettled(promises);
        }

        setIsFetching(false);
      }
    } catch (error) {
      console.error("Failed to fetch responses:", error);
      setIsFetching(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const interviewUrl = useMemo(
    () => (readableSlug ? `${base_url}/call/${readableSlug}` : (url as string)),
    [readableSlug, url],
  );

  const jumpToInterviewUrl = useMemo(
    () => (readableSlug ? `/call/${readableSlug}` : `/call/${url}`),
    [readableSlug, url],
  );

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(interviewUrl).then(
      () => {
        setCopied(true);
        toast.success(
          "The link to your interview has been copied to your clipboard.",
          {
            position: "bottom-right",
            duration: 3000,
          },
        );
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      },
      (err) => {
        console.log("failed to copy", err.mesage);
      },
    );
  }, [interviewUrl]);

  const handleJumpToInterview = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      window.open(jumpToInterviewUrl, "_blank");
    },
    [jumpToInterviewUrl],
  );

  return (
    <a
      href={`/interviews/${id}`}
      style={{
        pointerEvents: isFetching ? "none" : "auto",
        cursor: isFetching ? "default" : "pointer",
      }}
    >
      <Card className="relative p-0 mt-4 inline-block cursor-pointer h-60 w-56 ml-1 mr-3 rounded-xl shrink-0 overflow-hidden shadow-md">
        <CardContent className={`p-0 ${isFetching ? "opacity-60" : ""}`}>
          <div className="w-full h-40 overflow-hidden bg-indigo-600 flex items-center text-center">
            <CardTitle className="w-full mt-3 mx-2 text-white text-lg">
              {name}
              {isFetching && (
                <div className="z-100 mt-[-5px]">
                  <MiniLoader />
                </div>
              )}
            </CardTitle>
          </div>
          <div className="flex flex-row items-center mx-4 pt-1 pb-5">
            <div className="w-full overflow-hidden">
              <Image
                src={img}
                alt="Picture of the interviewer"
                width={70}
                height={70}
                className="object-cover object-center"
                priority={true}
                unoptimized={false}
                loading="eager"
              />
            </div>
            <div className="text-black text-sm font-semibold mr-2 whitespace-nowrap">
              Responses:{" "}
              <span className="font-normal">
                {responseCount?.toString() || 0}
              </span>
            </div>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              className="text-xs text-indigo-600 px-1 h-6"
              variant={"secondary"}
              onClick={handleJumpToInterview}
            >
              <ArrowUpRight size={16} />
            </Button>
            <Button
              className={`text-xs text-indigo-600 px-1 h-6  ${
                copied ? "bg-indigo-300 text-white" : ""
              }`}
              variant={"secondary"}
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                copyToClipboard();
              }}
            >
              {copied ? <CopyCheck size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export default React.memo(InterviewCard);
