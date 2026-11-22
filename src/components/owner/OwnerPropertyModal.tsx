"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import NewPropertyForm from "./NewPropertyForm";
import "./owner-property-modal.css";

export default function OwnerPropertyModal({
  label = "+ List your property",
  variant = "header",
  className,
}: {
  label?: string;
  variant?: "header" | "empty";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={
          className ||
          (variant === "header" ? "bm-list-button" : "bm-red-button")
        }
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="opm-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
          >
            <section
              className="opm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="opm-title"
            >
              <header className="opm-header">
                <div className="opm-brand">
                  <span className="opm-logo">
                    BookMy<span>PG</span>
                  </span>

                  <div>
                    <strong id="opm-title">List your property</strong>
                    <small>Property registration</small>
                  </div>
                </div>

                <button
                  type="button"
                  className="opm-close"
                  aria-label="Close property registration"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </header>

              <div className="opm-content">
                <NewPropertyForm onClose={() => setOpen(false)} />
              </div>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}
