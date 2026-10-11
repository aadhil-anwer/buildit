"use client";

import { useMemo } from "react";
import { Color } from "three";
import type { SceneObject } from "@/core/types";

/**
 * Parametric furniture: every piece is built from boxes and cylinders sized
 * from the object's real width/depth/height, so a shop product with real
 * dimensions renders at the right size without a 3D model file.
 * Local frame: x = width, z = depth with the front at +z, y = up from the floor.
 */

function shade(hex: string, amount: number): string {
  const c = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

type V3 = [number, number, number];

function Box({ p, s, c, rough = 0.85, metal = 0, opacity = 1 }: { p: V3; s: V3; c: string; rough?: number; metal?: number; opacity?: number }) {
  if (s[0] <= 0 || s[1] <= 0 || s[2] <= 0) return null;
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function Cyl({ p, r, h, c, r2, seg = 24, rough = 0.8, emissive }: { p: V3; r: number; h: number; c: string; r2?: number; seg?: number; rough?: number; emissive?: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r2 ?? r, r, h, seg]} />
      <meshStandardMaterial color={c} roughness={rough} emissive={emissive ?? "#000000"} emissiveIntensity={emissive ? 0.6 : 0} />
    </mesh>
  );
}

const LEG = "#3b2f27";

function Legs({ w, d, h, t = 0.05, inset = 0.05, c = LEG }: { w: number; d: number; h: number; t?: number; inset?: number; c?: string }) {
  const x = w / 2 - inset - t / 2;
  const z = d / 2 - inset - t / 2;
  return (
    <>
      {[
        [x, z],
        [-x, z],
        [x, -z],
        [-x, -z],
      ].map(([lx, lz], i) => (
        <Box key={i} p={[lx, h / 2, lz]} s={[t, h, t]} c={c} />
      ))}
    </>
  );
}

function Sofa({ o, arms = true }: { o: SceneObject; arms?: boolean }) {
  const { w, d, h, color } = o;
  const base = shade(color, -0.08);
  const seatH = Math.min(0.42, h * 0.5);
  const legH = 0.06;
  const backT = Math.min(0.2, d * 0.25);
  const armW = arms ? Math.min(0.16, w * 0.12) : 0;
  const armH = Math.min(h * 0.72, seatH + 0.2);
  const innerW = w - 2 * armW;
  const n = Math.max(1, o.seats ?? Math.round(innerW / 0.65));
  const cw = innerW / n;
  return (
    <group>
      <Box p={[0, legH + (seatH - legH - 0.12) / 2, 0]} s={[w, seatH - legH - 0.12, d]} c={base} />
      <Box p={[0, h / 2 + legH / 2, -d / 2 + backT / 2]} s={[w, h - legH, backT]} c={base} />
      {arms && (
        <>
          <Box p={[w / 2 - armW / 2, legH + (armH - legH) / 2, 0]} s={[armW, armH - legH, d]} c={base} />
          <Box p={[-w / 2 + armW / 2, legH + (armH - legH) / 2, 0]} s={[armW, armH - legH, d]} c={base} />
        </>
      )}
      {Array.from({ length: n }, (_, i) => (
        <group key={i}>
          <Box
            p={[-innerW / 2 + cw * (i + 0.5), seatH - 0.06, backT / 2 + 0.01]}
            s={[cw - 0.02, 0.13, d - backT - 0.03]}
            c={color}
          />
          <Box
            p={[-innerW / 2 + cw * (i + 0.5), seatH + (h - seatH) * 0.45, -d / 2 + backT + 0.07]}
            s={[cw - 0.03, (h - seatH) * 0.75, 0.12]}
            c={shade(color, 0.03)}
          />
        </group>
      ))}
      <Legs w={w} d={d} h={legH} t={0.04} inset={0.06} />
    </group>
  );
}

function Majlis({ o }: { o: SceneObject }) {
  const { w, d, h, color } = o;
  const baseH = 0.18;
  const seatH = 0.14;
  return (
    <group>
      <Box p={[0, baseH / 2, 0]} s={[w, baseH, d]} c={shade(color, -0.15)} />
      <Box p={[0, baseH + seatH / 2, 0.04]} s={[w - 0.02, seatH, d - 0.1]} c={color} />
      <Box p={[0, baseH + seatH + (h - baseH - seatH) / 2, -d / 2 + 0.11]} s={[w - 0.04, h - baseH - seatH, 0.2]} c={shade(color, 0.06)} />
      {/* trim line */}
      <Box p={[0, baseH + 0.01, d / 2 - 0.045]} s={[w - 0.01, 0.02, 0.01]} c="#c9a45c" metal={0.6} rough={0.4} />
    </group>
  );
}

function Table({ o }: { o: SceneObject }) {
  const { w, d, h, color } = o;
  const top = 0.04;
  const round = o.type === "round_table" || /round/.test(o.catalogId);
  if (round) {
    const r = Math.min(w, d) / 2;
    return (
      <group>
        <Cyl p={[0, h - top / 2, 0]} r={r} h={top} c={color} seg={40} />
        <Cyl p={[0, (h - top) / 2, 0]} r={0.05} h={h - top} c={shade(color, -0.2)} />
        <Cyl p={[0, 0.015, 0]} r={Math.min(r * 0.6, 0.3)} h={0.03} c={shade(color, -0.2)} />
      </group>
    );
  }
  return (
    <group>
      <Box p={[0, h - top / 2, 0]} s={[w, top, d]} c={color} rough={0.6} />
      {o.type === "coffee_table" && <Box p={[0, h * 0.25, 0]} s={[w - 0.12, 0.02, d - 0.12]} c={shade(color, -0.1)} />}
      <Legs w={w} d={d} h={h - top} t={o.type === "dining_table" ? 0.07 : 0.045} c={shade(color, -0.25)} />
    </group>
  );
}

function Chair({ o }: { o: SceneObject }) {
  const { w, d, h, color } = o;
  const seat = 0.46;
  if (o.type === "office_chair") {
    return (
      <group>
        <Cyl p={[0, 0.03, 0]} r={Math.min(w, d) * 0.45} h={0.04} c="#2a2a2a" seg={5} />
        <Cyl p={[0, seat / 2, 0]} r={0.03} h={seat} c="#555" />
        <Box p={[0, seat, 0.02]} s={[w * 0.8, 0.08, d * 0.75]} c={color} />
        <Box p={[0, seat + (h - seat) / 2 + 0.05, -d * 0.33]} s={[w * 0.75, h - seat - 0.05, 0.06]} c={color} />
      </group>
    );
  }
  return (
    <group>
      <Box p={[0, seat - 0.03, 0.02]} s={[w, 0.05, d - 0.04]} c={color} rough={0.6} />
      <Box p={[0, seat + (h - seat) / 2, -d / 2 + 0.03]} s={[w, h - seat, 0.04]} c={color} rough={0.6} />
      <Legs w={w} d={d} h={seat - 0.05} t={0.035} inset={0.02} c={shade(color, -0.2)} />
    </group>
  );
}

function Storage({ o }: { o: SceneObject }) {
  const { w, d, h, color } = o;
  const line = shade(color, -0.25);
  if (o.type === "bookshelf") {
    const t = 0.025;
    const shelves = Math.max(2, Math.round(h / 0.38));
    const books = ["#8a4b32", "#2f4a5c", "#c9a45c", "#5f7356", "#7a2e2e", "#d9c7a7"];
    return (
      <group>
        <Box p={[-w / 2 + t / 2, h / 2, 0]} s={[t, h, d]} c={color} />
        <Box p={[w / 2 - t / 2, h / 2, 0]} s={[t, h, d]} c={color} />
        <Box p={[0, h / 2, -d / 2 + 0.01]} s={[w, h, 0.02]} c={shade(color, -0.1)} />
        {Array.from({ length: shelves + 1 }, (_, i) => (
          <Box key={i} p={[0, (i * (h - t)) / shelves + t / 2, 0]} s={[w - 2 * t, t, d]} c={color} />
        ))}
        {Array.from({ length: shelves }, (_, i) =>
          Array.from({ length: Math.floor((w - 0.1) / 0.09) }, (_, j) =>
            (i * 7 + j * 3) % 5 === 0 ? null : (
              <Box
                key={`${i}-${j}`}
                p={[-w / 2 + 0.07 + j * 0.09, (i * (h - t)) / shelves + t + 0.12, 0.01]}
                s={[0.06, 0.22 + ((i + j) % 3) * 0.03, d * 0.7]}
                c={books[(i * 3 + j) % books.length]}
              />
            ),
          ),
        )}
      </group>
    );
  }
  if (o.type === "tv_unit") {
    const tvW = Math.min(w * 0.78, 1.45);
    const tvH = tvW * 0.5625;
    return (
      <group>
        <Box p={[0, h / 2 + 0.04, 0]} s={[w, h - 0.08, d]} c={color} rough={0.6} />
        <Legs w={w} d={d} h={0.08} t={0.04} inset={0.08} />
        {[-1, 0, 1].map((k) => (
          <Box key={k} p={[(k * w) / 3, h / 2 + 0.04, d / 2 + 0.002]} s={[0.006, h - 0.12, 0.004]} c={line} />
        ))}
        <Box p={[0, h + 0.02, -0.02]} s={[0.3, 0.04, 0.2]} c="#222" />
        <Box p={[0, h + 0.06 + tvH / 2, -0.02]} s={[tvW, tvH, 0.04]} c="#111" rough={0.3} metal={0.3} />
        <Box p={[0, h + 0.06 + tvH / 2, 0.001]} s={[tvW - 0.03, tvH - 0.03, 0.002]} c="#1d2633" rough={0.2} />
      </group>
    );
  }
  const doors = o.type === "wardrobe" ? Math.max(2, Math.round(w / 0.5)) : o.type === "sideboard" ? Math.max(2, Math.round(w / 0.45)) : 0;
  const drawers = o.type === "dresser" || o.type === "nightstand" ? (o.type === "nightstand" ? 2 : 3) : 0;
  const legH = o.type === "wardrobe" ? 0.05 : 0.1;
  return (
    <group>
      <Box p={[0, legH + (h - legH) / 2, 0]} s={[w, h - legH, d]} c={color} rough={0.7} />
      <Box p={[0, legH / 2, 0]} s={[w - 0.04, legH, d - 0.04]} c={shade(color, -0.3)} />
      {Array.from({ length: Math.max(0, doors - 1) }, (_, i) => (
        <Box key={i} p={[-w / 2 + ((i + 1) * w) / doors, legH + (h - legH) / 2, d / 2 + 0.002]} s={[0.006, h - legH - 0.02, 0.004]} c={line} />
      ))}
      {Array.from({ length: doors }, (_, i) => (
        <Box
          key={`h${i}`}
          p={[-w / 2 + ((i + 0.5) * w) / doors + (i % 2 ? -1 : 1) * (w / doors) * 0.35, legH + (h - legH) * 0.5, d / 2 + 0.012]}
          s={[0.015, Math.min(0.25, h * 0.15), 0.02]}
          c="#b8955a"
          metal={0.7}
          rough={0.35}
        />
      ))}
      {Array.from({ length: Math.max(0, drawers - 1) }, (_, i) => (
        <Box key={`d${i}`} p={[0, legH + ((i + 1) * (h - legH)) / drawers, d / 2 + 0.002]} s={[w - 0.02, 0.006, 0.004]} c={line} />
      ))}
      {Array.from({ length: drawers }, (_, i) => (
        <Box
          key={`dh${i}`}
          p={[0, legH + ((i + 0.5) * (h - legH)) / drawers, d / 2 + 0.012]}
          s={[Math.min(0.2, w * 0.3), 0.015, 0.02]}
          c="#b8955a"
          metal={0.7}
          rough={0.35}
        />
      ))}
    </group>
  );
}

function Bed({ o }: { o: SceneObject }) {
  const { w, d, h, color } = o;
  const frameH = 0.32;
  const mattH = 0.22;
  const head = 0.08;
  const sheet = "#f4f1ea";
  return (
    <group>
      <Box p={[0, frameH / 2, head / 2]} s={[w, frameH, d - head]} c={shade(color, -0.1)} />
      <Box p={[0, h / 2, -d / 2 + head / 2]} s={[w, h, head]} c={color} />
      <Box p={[0, frameH + mattH / 2, head / 2 + 0.02]} s={[w - 0.08, mattH, d - head - 0.1]} c={sheet} />
      <Box p={[0, frameH + mattH + 0.02, d * 0.12]} s={[w - 0.04, 0.05, d * 0.62]} c={shade(color, 0.12)} />
      {(w > 1.2 ? [-w / 4, w / 4] : [0]).map((x, i) => (
        <Box key={i} p={[x, frameH + mattH + 0.06, -d / 2 + head + 0.22]} s={[Math.min(0.6, w / 2 - 0.12), 0.12, 0.32]} c="#ffffff" />
      ))}
    </group>
  );
}

function Rug({ o }: { o: SceneObject }) {
  const round = /round/.test(o.catalogId);
  const border = shade(o.color, -0.18);
  if (round) {
    const r = Math.min(o.w, o.d) / 2;
    return (
      <group>
        <Cyl p={[0, 0.004, 0]} r={r} h={0.008} c={border} seg={48} rough={1} />
        <Cyl p={[0, 0.009, 0]} r={r - 0.12} h={0.002} c={o.color} seg={48} rough={1} />
      </group>
    );
  }
  return (
    <group>
      <Box p={[0, 0.004, 0]} s={[o.w, 0.008, o.d]} c={border} rough={1} />
      <Box p={[0, 0.009, 0]} s={[o.w - 0.2, 0.002, o.d - 0.2]} c={o.color} rough={1} />
      <Box p={[0, 0.0105, 0]} s={[o.w * 0.45, 0.001, o.d * 0.45]} c={shade(o.color, -0.08)} rough={1} />
    </group>
  );
}

function Lamp({ o }: { o: SceneObject }) {
  return (
    <group>
      <Cyl p={[0, 0.015, 0]} r={0.15} h={0.03} c={o.color} />
      <Cyl p={[0, o.h / 2, 0]} r={0.015} h={o.h - 0.3} c={o.color} rough={0.4} />
      <Cyl p={[0, o.h - 0.15, 0]} r={0.2} r2={0.13} h={0.28} c="#f3e7cf" emissive="#ffdca0" />
    </group>
  );
}

function Plant({ o }: { o: SceneObject }) {
  const r = Math.min(o.w, o.d) / 2;
  const potH = Math.min(0.35, o.h * 0.3);
  return (
    <group>
      <Cyl p={[0, potH / 2, 0]} r={r * 0.55} r2={r * 0.7} h={potH} c="#b5653a" />
      {[
        [0, potH + (o.h - potH) * 0.35, 0, r * 0.75],
        [r * 0.25, potH + (o.h - potH) * 0.65, r * 0.1, r * 0.6],
        [-r * 0.2, potH + (o.h - potH) * 0.8, -r * 0.15, r * 0.5],
      ].map(([x, y, z, rad], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[rad, 16, 12]} />
          <meshStandardMaterial color={shade(o.color, i * 0.05)} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Ottoman({ o }: { o: SceneObject }) {
  return <Cyl p={[0, o.h / 2, 0]} r={Math.min(o.w, o.d) / 2} h={o.h} c={o.color} seg={32} />;
}

function Bench({ o }: { o: SceneObject }) {
  return (
    <group>
      <Box p={[0, o.h - 0.03, 0]} s={[o.w, 0.06, o.d]} c={o.color} />
      <Legs w={o.w} d={o.d} h={o.h - 0.06} t={0.05} c={shade(o.color, -0.2)} />
    </group>
  );
}

function Fixture({ o }: { o: SceneObject }) {
  return <Box p={[0, o.h / 2, 0]} s={[o.w, o.h, o.d]} c={o.color} opacity={0.75} />;
}

export function FurnitureModel({ o }: { o: SceneObject }) {
  return useMemo(() => {
    switch (o.type) {
      case "sofa":
      case "armchair":
        return <Sofa o={o} />;
      case "majlis_seat":
        return <Majlis o={o} />;
      case "ottoman":
        return <Ottoman o={o} />;
      case "bench":
        return <Bench o={o} />;
      case "coffee_table":
      case "side_table":
      case "dining_table":
      case "round_table":
      case "desk":
        return <Table o={o} />;
      case "dining_chair":
      case "office_chair":
        return <Chair o={o} />;
      case "tv_unit":
      case "wardrobe":
      case "dresser":
      case "sideboard":
      case "bookshelf":
      case "nightstand":
        return <Storage o={o} />;
      case "bed":
        return <Bed o={o} />;
      case "rug":
        return <Rug o={o} />;
      case "floor_lamp":
        return <Lamp o={o} />;
      case "plant":
        return <Plant o={o} />;
      default:
        return <Fixture o={o} />;
    }
    // Only rebuild when the shape-defining fields change, not on moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.type, o.w, o.d, o.h, o.color, o.catalogId, o.seats]);
}
