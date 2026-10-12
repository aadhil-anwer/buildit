import type { Scene } from "@buildit/core";
import Svg, { Polygon, Rect } from "react-native-svg";
import { planGeometry } from "@/rooms/plan";
import { color } from "@/theme";


/** The room seen from above, scaled to whatever box it is placed in. The editor's Plan view and, until 3D thumbnails exist, the room thumbnails. `selectedId` outlines a piece in gold; `hiddenId` leaves one out (the piece being dragged). */
export function PlanView({ scene, width = 360, height = 196, pad = 12, selectedId, hiddenId }: { scene: Scene; width?: number; height?: number; pad?: number; selectedId?: string | null; hiddenId?: string | null }) {
  const plan = planGeometry(scene, width, height, pad);
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Polygon points={plan.wall} fill={color.bg} stroke={color.text} strokeWidth={2} strokeLinejoin="round" />
      {plan.items.filter((i) => i.id !== hiddenId).map((i) => (
        <Rect key={i.id} x={i.cx - i.w / 2} y={i.cy - i.d / 2} width={i.w} height={i.d} fill={i.color} stroke={i.id === selectedId ? color.accent : color.neutral500} strokeWidth={i.id === selectedId ? 2 : 0.75} transform={`rotate(${i.rotation} ${i.cx} ${i.cy})`} />
      ))}
    </Svg>
  );
}
