"use client";
// Uniform display of backend errors ({error: {kind, message, request_id}}) and network failures.
import { ApiError } from "@/lib/api";

export default function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  const e = error instanceof ApiError ? error : new ApiError({ status: 0, kind: "unexpected", message: String(error) });
  const hint = {
    rate_limited: `Too many requests. Try again in ${e.retryAfter ?? 60} s.`,
    capacity: "The server is storing too many investigations right now. Try again later.",
    network: null,
  }[e.kind];
  return (
    <div role="alert" className="rounded-lg border border-[var(--down)] bg-[var(--down-soft)] px-4 py-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="font-medium">{hint || e.message}</span>
      {e.requestId && <span className="text-xs text-[var(--muted)]">request id {e.requestId}</span>}
      {onRetry && <button onClick={onRetry} className="text-sm underline underline-offset-2">Retry</button>}
    </div>
  );
}
