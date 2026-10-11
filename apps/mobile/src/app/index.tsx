import { Redirect } from "expo-router";
import { useSession } from "@/auth/session";

export default function Entry() {
  return <Redirect href={useSession() ? "/rooms" : "/welcome"} />;
}
