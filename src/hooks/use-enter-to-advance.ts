"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_TARGETS =
  "input, textarea, select, button, a, [contenteditable='true'], [role='button'], [role='link']";

export function useEnterToAdvance(
  enabled: boolean,
  onAdvance: () => void | Promise<void>,
) {
  const callback = useRef(onAdvance);
  const advancing = useRef(false);

  useEffect(() => {
    callback.current = onAdvance;
  }, [onAdvance]);

  useEffect(() => {
    if (!enabled) {
      advancing.current = false;
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key !== "Enter" ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.defaultPrevented ||
        advancing.current
      )
        return;
      const target = event.target;
      if (target instanceof Element && target.closest(INTERACTIVE_TARGETS))
        return;
      if (document.querySelector('[data-enter-advance-blocker="true"]')) return;

      event.preventDefault();
      advancing.current = true;
      void Promise.resolve()
        .then(() => callback.current())
        .finally(() => {
          advancing.current = false;
        });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
