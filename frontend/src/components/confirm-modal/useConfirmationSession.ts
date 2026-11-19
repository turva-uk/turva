import { useCallback, useLayoutEffect, useRef } from "react";

/** A field error belongs to the opening that submitted it, never a later one. */
export default function useConfirmationSession(opened: boolean) {
  const generation = useRef(0);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    generation.current += 1;
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, [opened]);
  return useCallback(() => {
    const attempt = generation.current;
    return () => mounted.current && attempt === generation.current;
  }, []);
}
