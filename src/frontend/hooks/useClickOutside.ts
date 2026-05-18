import { useEffect, RefObject } from "react";

interface UseClickOutsideProps {
  ref: RefObject<HTMLElement | null>;
  callback: () => void;
  /**
   * Optional list of refs that should be treated as inside clicks.
   * If the event target is contained within any of these refs,
   * the callback will NOT be invoked.
   */
  excludeRefs?: Array<RefObject<HTMLElement | null>>;
}

const useClickOutside = ({
  ref,
  callback,
  excludeRefs = [],
}: UseClickOutsideProps) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;

      const clickedInsideModal =
        !!ref.current && ref.current.contains(targetNode);
      if (clickedInsideModal) return;

      const clickedInsideExcludes = excludeRefs.some((excludeRef) => {
        const excludeEl = excludeRef?.current;
        return excludeEl ? excludeEl.contains(targetNode) : false;
      });

      if (!clickedInsideExcludes) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback, excludeRefs]);
};

export default useClickOutside;
