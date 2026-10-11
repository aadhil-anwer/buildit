import { useEffect, useState } from "react";
import { z } from "zod";
import { report } from "@/lib/report";
import { supabase } from "@/lib/supabase";

export interface AiUsage {
  used: number;
  limit: number;
  resetsAt: Date;
}

const row = z.object({ used: z.number(), daily_limit: z.number(), resets_at: z.string() });

/** Today's AI usage, read from the server. A failure is reported and flagged; it never blocks the screen. */
export function useAiUsage() {
  const [state, setState] = useState<{ usage?: AiUsage; failed: boolean }>({ failed: false });
  useEffect(() => {
    void (async () => {
      const reply = await supabase.rpc("ai_usage_today");
      const parsed = z.array(row).length(1).safeParse(reply.data as unknown); // the reply is untrusted until it parses
      if (reply.error || !parsed.success) {
        report(reply.error ?? parsed.error, { source: "ai-usage" });
        return setState({ failed: true });
      }
      const first = parsed.data[0];
      setState({ usage: { used: first.used, limit: first.daily_limit, resetsAt: new Date(first.resets_at) }, failed: false });
    })();
  }, []);
  return state;
}
