"use client";

import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { Shape, type Group } from "three";
import { getWalls, type Wall } from "@/core/room";
import type { Opening, Room } from "@/core/types";
import { useEditor } from "../store";

const THICK = 0.12;

interface Piece {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

/** Split a wall into solid rectangles around its openings. */
function wallPieces(length: number, height: number, openings: Opening[]): Piece[] {
  const cuts = new Set<number>([0, length]);
  for (const o of openings) {
    cuts.add(Math.max(0, Math.min(length, o.offset)));
    cuts.add(Math.max(0, Math.min(length, o.offset + o.width)));
  }
  const us = [...cuts].sort((a, b) => a - b);
  const pieces: Piece[] = [];
  for (let i = 0; i < us.length - 1; i++) {
    const u0 = us[i];
    const u1 = us[i + 1];
    if (u1 - u0 < 1e-4) continue;
    const mid = (u0 + u1) / 2;
    const holes = openings
      .filter((o) => o.offset < mid && o.offset + o.width > mid)
      .map((o) => [Math.max(0, o.sill), Math.min(height, o.sill + o.height)] as const)
      .sort((a, b) => a[0] - b[0]);
    let v = 0;
    for (const [h0, h1] of holes) {
      if (h0 > v + 1e-4) pieces.push({ u0, u1, v0: v, v1: h0 });
      v = Math.max(v, h1);
    }
    if (height > v + 1e-4) pieces.push({ u0, u1, v0: v, v1: height });
  }
  return pieces;
}

function WallMesh({ wall, room, openings, extendStart }: { wall: Wall; room: Room; openings: Opening[]; extendStart: boolean }) {
  const full = useRef<Group>(null);
  const low = useRef<Group>(null);
  const mid = { x: wall.start.x + (wall.dir.x * wall.length) / 2, z: wall.start.z + (wall.dir.z * wall.length) / 2 };
  const outward = { x: -wall.inward.x, z: -wall.inward.z };
  const angle = Math.atan2(-wall.dir.z, wall.dir.x);
  const pieces = useMemo(() => wallPieces(wall.length, room.height, openings), [wall.length, room.height, openings]);

  // Dollhouse view: hide walls between the camera and the room.
  useFrame(({ camera }) => {
    const dx = camera.position.x - mid.x;
    const dz = camera.position.z - mid.z;
    // In plan view every wall is drawn low so the floor plan reads clearly.
    const plan = useEditor.getState().view === "top";
    const outside = plan || dx * outward.x + dz * outward.z > 0.3;
    if (full.current) full.current.visible = !outside;
    if (low.current) low.current.visible = outside;
  });

  const place = (u: number) => ({
    x: wall.start.x + wall.dir.x * u + outward.x * (THICK / 2),
    z: wall.start.z + wall.dir.z * u + outward.z * (THICK / 2),
  });

  return (
    <group>
      <group ref={full}>
        {pieces.map((p, i) => {
          // Fill the outside corner square at convex corners.
          const a = extendStart && p.u0 === 0 ? -THICK : p.u0;
          const c = place((a + p.u1) / 2);
          return (
            <mesh key={i} position={[c.x, (p.v0 + p.v1) / 2, c.z]} rotation={[0, angle, 0]} castShadow receiveShadow>
              <boxGeometry args={[p.u1 - a, p.v1 - p.v0, THICK]} />
              <meshStandardMaterial color={room.wallColor} roughness={0.95} />
            </mesh>
          );
        })}
        {openings
          .filter((o) => o.type === "window")
          .map((o) => {
            const c = place(o.offset + o.width / 2);
            return (
              <mesh key={o.id} position={[c.x, o.sill + o.height / 2, c.z]} rotation={[0, angle, 0]}>
                <boxGeometry args={[o.width, o.height, 0.02]} />
                <meshStandardMaterial color="#bfe0f5" transparent opacity={0.35} roughness={0.05} metalness={0.1} />
              </mesh>
            );
          })}
      </group>
      <group ref={low} visible={false}>
        {pieces
          .filter((p) => p.v0 < 0.01)
          .map((p, i) => {
            const a = extendStart && p.u0 === 0 ? -THICK : p.u0;
            const c = place((a + p.u1) / 2);
            return (
              <mesh key={i} position={[c.x, 0.05, c.z]} rotation={[0, angle, 0]}>
                <boxGeometry args={[p.u1 - a, 0.1, THICK]} />
                <meshStandardMaterial color={room.wallColor} roughness={0.95} />
              </mesh>
            );
          })}
      </group>
    </group>
  );
}

/** Quarter-circle on the floor showing where a door swings. */
function DoorSwing({ wall, o }: { wall: Wall; o: Opening }) {
  const points = useMemo(() => {
    const hinge = { x: wall.start.x + wall.dir.x * o.offset, z: wall.start.z + wall.dir.z * o.offset };
    const r = o.width;
    const pts: [number, number, number][] = [[hinge.x, 0.015, hinge.z]];
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) * (Math.PI / 2);
      const dx = wall.dir.x * Math.cos(t) + wall.inward.x * Math.sin(t);
      const dz = wall.dir.z * Math.cos(t) + wall.inward.z * Math.sin(t);
      pts.push([hinge.x + dx * r, 0.015, hinge.z + dz * r]);
    }
    pts.push([hinge.x, 0.015, hinge.z]);
    return pts;
  }, [wall, o.offset, o.width]);
  return <Line points={points} color="#8a7d6b" lineWidth={1.2} dashed dashSize={0.06} gapSize={0.04} />;
}

export function RoomMesh({ room, onFloorClick }: { room: Room; onFloorClick?: () => void }) {
  const walls = useMemo(() => getWalls(room), [room]);
  const shape = useMemo(() => {
    const s = new Shape();
    room.corners.forEach((c, i) => (i ? s.lineTo(c.x, -c.z) : s.moveTo(c.x, -c.z)));
    s.closePath();
    return s;
  }, [room.corners]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={(e) => { if (e.button === 0) onFloorClick?.(); }}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={room.floorColor} roughness={0.9} />
      </mesh>
      {walls.map((w, i) => {
        const prev = walls[(i - 1 + walls.length) % walls.length];
        const convex = prev.dir.x * w.dir.z - prev.dir.z * w.dir.x > 0;
        return (
          <WallMesh
            key={w.index}
            wall={w}
            room={room}
            openings={room.openings.filter((o) => o.wall === w.index)}
            extendStart={convex}
          />
        );
      })}
      {room.openings
        .filter((o) => o.type === "door")
        .map((o) => (walls[o.wall] ? <DoorSwing key={o.id} wall={walls[o.wall]} o={o} /> : null))}
    </group>
  );
}
