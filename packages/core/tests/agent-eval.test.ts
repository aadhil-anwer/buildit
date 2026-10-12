/**
 * The evaluation set for the AI designer's pipeline. Each scenario is a request with the tool calls a good model would
 * make, played through the real loop and engine. What it checks is the guarantee, not the model: whatever the model
 * asks for, the room that comes back parses, keeps locked pieces where they were, never has more hard errors than it
 * started with, and the "measured" numbers are the engine's. Run against the real model (with the key) it becomes the
 * quality measure; the same invariants then judge the model's choices.
 */
import { describe, expect, test } from "vitest";
import { parseScene } from "../src/schema";
import { STYLE_KEYS } from "../src/styles";
import { sampleBedroom, sampleLivingRoom } from "../src/templates";
import type { Scene } from "../src/types";
import { call, collect, finish, say, scriptedModel, use } from "./agent-helpers";
import type { ModelToolCall } from "../src/agent";

interface Scenario {
  name: string;
  room: () => Scene;
  request: string;
  calls: ModelToolCall[];
}

const ROOMS: [string, () => Scene][] = [["bedroom", sampleBedroom], ["living room", sampleLivingRoom]];
const WALLS = ["north", "south", "east", "west"];

function scenarios(): Scenario[] {
  return ROOMS.flatMap(([room, make]) => {
    const scene = make();
    const movable = scene.objects.filter((o) => o.type !== "rug");
    return [
      ...STYLE_KEYS.map((style) => ({ name: `${room}: ${style} style`, room: make, request: `make it ${style}`, calls: [call("restyle_room", { style })] })),
      ...(["chalk", "sand", "sage", "clay", "stone", "ink"] as const).map((wall) => ({ name: `${room}: ${wall} walls`, room: make, request: `${wall} walls please`, calls: [call("set_room_finish", { wall })] })),
      ...(["oak", "walnut", "ash"] as const).map((floor) => ({ name: `${room}: ${floor} floor`, room: make, request: `${floor} floor`, calls: [call("set_room_finish", { floor })] })),
      { name: `${room}: fix the walkways`, room: make, request: "more walking space", calls: [call("improve_layout", {})] },
      { name: `${room}: add a rug under the first piece`, room: make, request: "add a rug", calls: [call("add_object", { catalog_id: "rug_bedroom", placement: { type: "near", target: "center" } })] },
      { name: `${room}: add a floor lamp`, room: make, request: "add a lamp", calls: [call("add_object", { catalog_id: "floor_lamp", placement: { type: "near", target: movable[0].id } })] },
      { name: `${room}: lock everything then try to move it`, room: make, request: "keep everything, but tidy up", calls: [...movable.map((o) => call("lock_object", { object_id: o.id, locked: true }, `l-${o.id}`)), ...movable.map((o) => call("move_object", { object_id: o.id, placement: { type: "against_wall", wall: "south" } }, `m-${o.id}`))] },
      ...movable.flatMap((o) => [
        ...WALLS.map((wall) => ({ name: `${room}: ${o.id} against the ${wall} wall`, room: make, request: `${o.name} on the ${wall} wall`, calls: [call("move_object", { object_id: o.id, placement: { type: "against_wall", wall } })] })),
        { name: `${room}: turn ${o.id}`, room: make, request: `turn the ${o.name}`, calls: [call("rotate_object", { object_id: o.id, by_degrees: 90 })] },
        { name: `${room}: remove ${o.id}`, room: make, request: `remove the ${o.name}`, calls: [call("remove_object", { object_id: o.id })] },
      ]),
    ];
  });
}

const all = scenarios();

test("the evaluation set is broad: dozens of requests across both preset rooms", () => expect(all.length).toBeGreaterThanOrEqual(60));

describe.each(all.map((s) => [s.name, s] as const))("%s", (_name, s) => {
  test("the pipeline keeps its guarantees", async () => {
    const scene = s.room();
    const locked = new Map(scene.objects.filter((o) => o.locked).map((o) => [o.id, [o.x, o.z]]));
    const { model } = scriptedModel([use(...s.calls), say("Done.")]);
    const events = await collect(model, { scene, message: s.request });

    expect(events.at(-1)?.type).toBe("done");
    expect(events.some((e) => e.type === "error")).toBe(false);
    const done = finish(events)!;
    expect(parseScene(done.scene)).not.toBeNull();
    expect(done.after.errors).toBeLessThanOrEqual(done.before.errors);
    for (const [id, pos] of locked) expect(done.scene.objects.find((o) => o.id === id)).toMatchObject({ x: pos[0], z: pos[1] });
    if (s.name.includes("lock everything")) {
      for (const o of scene.objects.filter((o) => o.type !== "rug")) {
        const after = done.scene.objects.find((p) => p.id === o.id)!;
        expect([after.x, after.z], `${o.id} was locked`).toEqual([o.x, o.z]);
      }
    }
    expect(done.measured.every((m) => m.before !== m.after)).toBe(true);
  });
});
