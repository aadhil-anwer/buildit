type Context = Record<string, unknown>;
type Sink = (error: Error, context?: Context) => void;

let sink: Sink | undefined;
export const setSink = (s: Sink | undefined) => {
  sink = s;
};

/** The one place errors go. Always logs; forwards to the monitoring sink; never throws. */
export function report(error: unknown, context?: Context) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(err, context);
  try {
    sink?.(err, context);
  } catch (sinkError) {
    console.error("monitoring sink failed", sinkError);
  }
}
