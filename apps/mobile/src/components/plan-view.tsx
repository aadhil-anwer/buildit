import type { Scene } from "@buildit/core";
import Svg, { Polygon, Rect } from "react-native-svg";
import { planGeometry } from "@/rooms/plan";
import { color } from "@/theme";


/** The room seen from above, scaled to whatever box it is placed in. A stand-in for the 3D thumbnail until Phase 4. */
export function PlanView({ scene, width = 360, height = 196, pad = 12 }: { scene: Scene; width?: number; height?: number; pad?: number }) {
  const plan = planGeometry(scene, width, height, pad);
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Polygon points={plan.wall} fill={color.bg} stroke={color.text} strokeWidth={2} strokeLinejoin="round" />
      {plan.items.map((i) => (
        <Rect key={i.id} x={i.cx - i.w / 2} y={i.cy - i.d / 2} width={i.w} height={i.d} fill={i.color} stroke={color.neutral500} strokeWidth={0.75} transform={`rotate(${i.rotation} ${i.cx} ${i.cy})`} />
      ))}
    </Svg>
  );
}
