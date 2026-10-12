import { SignIn } from "@/screens/sign-in";

// Behind the login guard: only a signed-in guest can reach it (the sign-in route is for signed-out people).
export default function Upgrade() {
  return <SignIn upgrade />;
}
