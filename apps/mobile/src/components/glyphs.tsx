import Svg, { Circle } from "react-native-svg";

type GlyphProps = { size?: number; color?: string; strokeWidth?: number; style?: object };

/** The design's status dot: a ring of radius 4 in the 24-unit grid (Lucide's own `dot` is a different, smaller shape). */
export const RingDot = ({ size = 20, color, strokeWidth = 1.5, style }: GlyphProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <Circle cx={12} cy={12} r={4} fill="none" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);
