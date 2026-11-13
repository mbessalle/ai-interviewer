import { registerOTel } from "@vercel/otel";

/**
 * Next.js calls this once when the server starts. It turns on OpenTelemetry tracing:
 * every request and every model call (see src/lib/llm/chat.ts) becomes a span.
 * On Vercel the traces go to the project's observability view; elsewhere set
 * OTEL_EXPORTER_OTLP_ENDPOINT to send them to any OTLP collector.
 */
export function register() {
  registerOTel({ serviceName: "ai-interviewer" });
}
