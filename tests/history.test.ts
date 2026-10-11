import { describe, expect, test } from "vitest";
import { sampleLivingRoom } from "@/core/templates";
import { canUndo, commit, currentVersion, initHistory, redo, redoTarget, restore, undo } from "@/editor/history";

describe("version history", () => {
  test("undo, redo, and a new edit after undo keeps the old branch", () => {
    const s0 = sampleLivingRoom();
    const s1 = { ...s0, id: "a" };
    const s2 = { ...s0, id: "b" };
    const s3 = { ...s0, id: "c" };
    let h = initHistory(s0);
    expect(canUndo(h)).toBe(false);
    h = commit(h, s1, "one", "user");
    h = commit(h, s2, "two", "ai");
    h = undo(h);
    expect(currentVersion(h).label).toBe("one");
    expect(redoTarget(h)?.label).toBe("two");
    h = redo(h);
    expect(currentVersion(h).label).toBe("two");
    h = undo(h);
    h = commit(h, s3, "three", "user");
    // "two" is not deleted: it is still in the list and can be restored.
    expect(h.versions.map((v) => v.label)).toEqual(["Original layout", "one", "two", "three"]);
    const two = h.versions.find((v) => v.label === "two")!;
    h = restore(h, two.id);
    expect(currentVersion(h).scene.id).toBe("b");
    expect(undo(h).current).toBe(h.versions.find((v) => v.label === "one")!.id);
  });
});
