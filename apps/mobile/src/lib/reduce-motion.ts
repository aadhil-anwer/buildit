import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { report } from "@/lib/report";

/** True when the person has asked their phone for less motion: animations then show their end state instead. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch((e: unknown) => report(e, { source: "reduce-motion" }));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
