import type { ThreeElements } from "@react-three/fiber";

// Lets <mesh>, <group> and the rest of react-three-fiber's elements type-check in React 19.
declare module "react" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging needs an interface
    interface IntrinsicElements extends ThreeElements {}
  }
}
