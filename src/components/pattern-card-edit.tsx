"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { PatternEditForm, type EditablePattern } from "./pattern-edit-form";

/**
 * Moderator-only edit affordance on a gallery card.
 *
 * Rendered as a sibling of the card's <Link>, never inside it: a button nested
 * in an anchor is invalid HTML and every click would navigate instead. The form
 * lives in a modal <dialog> rather than expanding in place because a card is a
 * ~300px grid cell — inline editing would either crush the form or shove the
 * whole grid around.
 */
export function PatternCardEdit({ pattern }: { pattern: EditablePattern }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="pattern-card-edit"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${pattern.title}`}
      >
        <Pencil size={13} aria-hidden="true" /> Edit
      </button>
      <dialog
        ref={dialogRef}
        className="pattern-edit-dialog"
        aria-label={`Edit ${pattern.title}`}
        // Esc and backdrop dismissal bypass setOpen, so mirror the state back.
        onClose={() => setOpen(false)}
        onClick={(event) => { if (event.target === dialogRef.current) setOpen(false); }}
      >
        {open && (
          <div className="pattern-edit-dialog-body">
            <h2>{pattern.title}</h2>
            <PatternEditForm pattern={pattern} onDone={() => setOpen(false)} closeLabel="Cancel" />
          </div>
        )}
      </dialog>
    </>
  );
}
