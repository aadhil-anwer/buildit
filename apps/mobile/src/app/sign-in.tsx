import { useLocalSearchParams } from "expo-router";
import { SignIn } from "@/screens/sign-in";

export default function SignInRoute() {
  const { upgrade } = useLocalSearchParams<{ upgrade?: string }>();
  return <SignIn upgrade={upgrade === "1"} />;
}
