import { useEffect } from "react";

export interface HotKeyOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  /**
   * Ignore events when user is typing in inputs, textareas, selects or contenteditable elements.
   * Defaults to true.
   */
  ignoreEditableElements?: boolean;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  const isContentEditable = target.getAttribute("contenteditable");
  return isContentEditable === "" || isContentEditable === "true";
}

export function useHotKey(
  keys: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: HotKeyOptions = {},
): void {
  const {
    enabled = true,
    preventDefault = false,
    stopPropagation = false,
    ignoreEditableElements = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const normalizedKeys = (Array.isArray(keys) ? keys : [keys]).map((k) =>
      k.toLowerCase(),
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (ignoreEditableElements && isEditableElement(event.target)) return;

      const key = event.key.toLowerCase();
      if (!normalizedKeys.includes(key)) return;

      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();

      handler(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    keys,
    handler,
    preventDefault,
    stopPropagation,
    ignoreEditableElements,
  ]);
}

export default useHotKey;
