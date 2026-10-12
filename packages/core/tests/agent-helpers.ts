import type { AgentEvent, AgentModel, AgentRequest, Message, ModelToolCall, ModelTurn } from "../src/agent";
import { runAgent } from "../src/agent";

/** A model that plays back fixed turns, and remembers what it was shown. */
export function scriptedModel(turns: ModelTurn[]) {
  const seen: Message[][] = [];
  let i = 0;
  const model: AgentModel = {
    turn: ({ messages }) => {
      seen.push([...messages]);
      const next = turns[i++];
      return next ? Promise.resolve(next) : Promise.reject(new Error("the script ran out of turns"));
    },
  };
  return { model, seen };
}

export const call = (name: string, input: unknown, id = `c-${name}`): ModelToolCall => ({ id, name, input });
export const use = (...calls: ModelToolCall[]): ModelTurn => ({ text: "", toolCalls: calls, stop: "tool_use" });
export const say = (text: string): ModelTurn => ({ text, toolCalls: [], stop: "end" });

export async function collect(model: AgentModel, req: AgentRequest): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const e of runAgent(model, req)) events.push(e);
  return events;
}

export const finish = (events: AgentEvent[]) => events.find((e): e is Extract<AgentEvent, { type: "done" }> => e.type === "done");
