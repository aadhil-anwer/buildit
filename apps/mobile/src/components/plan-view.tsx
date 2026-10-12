import type { Scene } from "@buildit/core";
import Svg, { Polygon, Rect } from "react-native-svg";
import type { WalkRun } from "@/editor/walk-overlay";
import { planGeometry } from "@/rooms/plan";
import { color, rust, withAlpha } from "@/theme";


/** The room seen from above, scaled to whatever box it is placed in. The editor's Plan view and, until 3D thumbnails exist, the room thumbnails. `selectedId` outlines a piece in gold; `hiddenId` leaves one out (the piece being dragged); `walk` shades where a person can walk. */
export function PlanView({ scene, width = 360, height = 196, pad = 12, selectedId, hiddenId, walk }: { scene: Scene; width?: number; height?: number; pad?: number; selectedId?: string | null; hiddenId?: string | null; walk?: WalkRun[] }) {
  const plan = planGeometry(scene, width, height, pad);
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Polygon points={plan.wall} fill={color.bg} stroke={color.text} strokeWidth={2} strokeLinejoin="round" />
      {walk?.map((r, i) => {
        const [a, b] = [plan.at(r.x, r.z), plan.at(r.x + r.w, r.z + r.d)];
        return <Rect key={i} x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} fill={r.kind === "walkable" ? withAlpha(color.accent, 0.26) : withAlpha(rust.base, 0.5)} />;
      })}
      {plan.items.filter((i) => i.id !== hiddenId).map((i) => (
        <Rect key={i.id} x={i.cx - i.w / 2} y={i.cy - i.d / 2} width={i.w} height={i.d} fill={i.color} stroke={i.id === selectedId ? color.accent : color.neutral500} strokeWidth={i.id === selectedId ? 2 : 0.75} transform={`rotate(${i.rotation} ${i.cx} ${i.cy})`} />
      ))}
    </Svg>
  );
}
