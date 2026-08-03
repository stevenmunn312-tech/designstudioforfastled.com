"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { reviewPattern, type ReviewState } from "./actions";

const initialState: ReviewState = { message: "", tone: "idle" };

export function ReviewControls({ patternId }: { patternId: string }) {
  const reviewAction = reviewPattern.bind(null, patternId);
  const [state, action, pending] = useActionState(reviewAction, initialState);

  return (
    <form action={action} className="review-controls">
      {state.message && (
        <p className={`review-message ${state.tone}`} aria-live="polite">{state.message}</p>
      )}
      <button className="review-reject" disabled={pending} name="decision" type="submit" value="rejected">
        <X size={16} aria-hidden="true" /> Reject
      </button>
      <button className="review-approve" disabled={pending} name="decision" type="submit" value="approved">
        <Check size={16} aria-hidden="true" /> {pending ? "Saving…" : "Approve & publish"}
      </button>
    </form>
  );
}
