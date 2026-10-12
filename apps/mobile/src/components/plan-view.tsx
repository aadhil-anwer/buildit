import type { Scene } from "@buildit/core";
import { Fragment } from "react";
import Svg, { Line, Polygon, Rect } from "react-native-svg";
import { doorSwings, swingArc } from "@/editor/door-swing";
import type { WalkRun } from "@/editor/walk-overlay";
import { planGeometry } from "@/rooms/plan";
import { color, rust, withAlpha } from "@/theme";


/** The room seen from above, scaled to whatever box it is placed in. The editor's Plan view and, until 3D thumbnails exist, the room thumbnails. `selectedId` outlines a piece in gold; `hiddenId` leaves one out (the piece being dragged); `walk` shades where a person can walk; `doors` draws each door's swing. */
export function PlanView({ scene, width = 360, height = 196, pad = 12, selectedId, hiddenId, walk, doors }: { scene: Scene; width?: number; height?: number; pad?: number; selectedId?: string | null; hiddenId?: string | null; walk?: WalkRun[]; doors?: boolean }) {
  const plan = planGeometry(scene, width, height, pad);
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Polygon points={plan.wall} fill={color.bg} stroke={color.text} strokeWidth={2} strokeLinejoin="round" />
      {walk?.map((r, i) => {
        const [a, b] = [plan.at(r.x, r.z), plan.at(r.x + r.w, r.z + r.d)];
        return <Rect key={i} x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} fill={r.kind === "walkable" ? withAlpha(color.accent, 0.26) : withAlpha(rust.base, 0.5)} />;
      })}
      {doors ? doorSwings(scene.room).map((d) => {
        const arc = swingArc(d).map((p) => plan.at(p.x, p.z));
        const hinge = plan.at(d.hinge.x, d.hinge.z);
        return (
          <Fragment key={d.openingId}>
            <Polygon points={[hinge, ...arc].map((p) => `${p.x},${p.y}`).join(" ")} fill={withAlpha(color.accent, 0.14)} stroke={withAlpha(color.accent, 0.55)} strokeWidth={1} />
            <Line x1={hinge.x} y1={hinge.y} x2={arc[arc.length - 1].x} y2={arc[arc.length - 1].y} stroke={color.text} strokeWidth={2} />
          </Fragment>
        );
      }) : null}
      {plan.items.filter((i) => i.id !== hiddenId).map((i) => (
        <Rect key={i.id} x={i.cx - i.w / 2} y={i.cy - i.d / 2} width={i.w} height={i.d} fill={i.color} stroke={i.id === selectedId ? color.accent : color.neutral500} strokeWidth={i.id === selectedId ? 2 : 0.75} transform={`rotate(${i.rotation} ${i.cx} ${i.cy})`} />
      ))}
    </Svg>
  );
}
