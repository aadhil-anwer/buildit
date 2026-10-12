import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton } from "@/components/icon-button";
import { PlanView } from "@/components/plan-view";
import { Plate } from "@/components/plate";
import { Sheet } from "@/components/sheet";
import type { Snap } from "@/components/sheet-snap";
import { SheetTabs } from "@/components/sheet-tabs";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { useRooms } from "@/rooms/store";
import { RoomGone } from "./room-gone";

const TABS = (["tAsk", "tAdd", "tItem", "tFin"] as const).map((key) => ({ key, label: t(key) }));

// A stand-in for the room editor (Phase 4): the room on a plan, the design's bottom sheet and its tabs. The tab contents are not built yet and say so.
export function Editor() {
  const router = useRouter();
  const insets = useScreenInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useRooms((s) => s.rooms.find((r) => r.id === id));
  const [snap, setSnap] = useState<Snap>("half");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("tAsk");
  if (!room) return <RoomGone />;
  return (
    <View style={[styles.root, { paddingTop: insets.top - 4 }]}>
      <IconButton icon="back" label={t("back")} quiet onPress={() => router.back()} />
      <Text variant="title">{room.name}</Text>
      <Plate mat={5} grade={false} style={styles.plan}><PlanView scene={room.scene} /></Plate>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetTabs tabs={TABS} value={tab} onChange={setTab} />
        <Text variant="bodySm" tone="secondary" style={styles.soon}>{t("tabSoon")}</Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 18 },
  plan: { height: 300 },
  soon: { padding: 20 },
});
