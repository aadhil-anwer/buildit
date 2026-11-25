import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { report } from "./report";

const run = (p: () => Promise<void>, what: string) => {
  if (Platform.OS === "web") return; // no vibration on the web build
  p().catch((e: unknown) => report(e, { source: "haptics", what }));
};

/** Physical feedback for moments that matter: a piece lands, a choice is made, the room gets better. */
export const haptic = {
  /** A piece snaps into place. */
  land: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), "land"),
  /** A choice is picked (room kind, style). */
  pick: () => run(() => Haptics.selectionAsync(), "pick"),
  /** Something got better: the score rose, the room was furnished, every essential is in. */
  win: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), "win"),
};
