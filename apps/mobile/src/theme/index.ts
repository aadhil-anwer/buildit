import { tokens } from "./tokens.generated";

export const { color, space, radius, shadow, rust } = tokens;

/** A hex colour at the given opacity, for pressed tints. */
export const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
