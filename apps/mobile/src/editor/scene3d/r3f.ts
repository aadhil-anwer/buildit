// The web build uses React Three Fiber's DOM canvas; phones use the native one (r3f.native.ts). Import R3F values from here, never from the package root.
export { Canvas, useFrame, useThree } from "@react-three/fiber";
