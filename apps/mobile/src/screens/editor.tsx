import type { OpResult } from "@buildit/core";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Sheet } from "@/components/sheet";
import { fitHeights, type Snap } from "@/components/sheet-snap";
import { SheetTabs } from "@/components/sheet-tabs";
import { Toast, useToast } from "@/components/toast";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { useWindowDimensions } from "react-native";
import { useFail } from "@/lib/use-fail";
import { EditorHeader } from "@/editor/header";
import { fixLayout } from "@/editor/fix";
import { PlanCanvas } from "@/editor/plan-canvas";
import { AddPane } from "@/editor/panes/add-pane";
import { AskPane } from "@/editor/panes/ask-pane";
import { CheckPane } from "@/editor/panes/check-pane";
import { FinishesPane } from "@/editor/panes/finishes-pane";
import { ItemPane } from "@/editor/panes/item-pane";
import { RoomCheckChip } from "@/editor/room-check-chip";
import { useEditor, useScene, type EditorTab } from "@/editor/store";
import { useRoomCheck } from "@/editor/use-room-check";
import { typeName } from "@/rooms/names";
import { useRooms } from "@/rooms/store";
import { RoomGone } from "./room-gone";

const TABS = (["tAsk", "tAdd", "tItem", "tFin"] as const).map((key) => ({ key, label: t(key) }));

/** Runs the layout fixer, and says what came of it. */
function useFix() {
  const [fixing, setFixing] = useState(false);
  const fail = useFail();
  const fix = async () => {
    setFixing(true);
    try {
      const { commit, history } = useEditor.getState();
      const result = await fixLayout(history!.present);
      useToast.getState().show(commit(result) ? t("fixed") : t("fixNone"));
    } catch (error) {
      fail(error);
    } finally {
      setFixing(false);
    }
  };
  return { fixing, fix };
}

function EditorBody({ name }: { name: string }) {
  const insets = useScreenInsets();
  const scene = useScene();
  const { score, rules } = useRoomCheck(scene);
  const { fixing, fix } = useFix();
  const [snap, setSnap] = useState<Snap>("half");
  const [tab, selectedId] = [useEditor((s) => s.tab), useEditor((s) => s.selectedId)];
  const heights = fitHeights(useWindowDimensions().height, insets.top + 24);
  useEffect(() => setSnap((s) => (selectedId && s === "peek" ? "half" : s)), [selectedId]);
  const pane: Record<EditorTab, () => React.JSX.Element> = { tAsk: () => <AskPane onFix={() => void fix()} />, tAdd: AddPane, tItem: ItemPane, tFin: FinishesPane, check: () => <CheckPane onFix={() => void fix()} fixing={fixing} /> };
  const Pane = pane[tab];
  const place = (id: string, result: OpResult) => {
    const piece = scene.objects.find((o) => o.id === id);
    if (!useEditor.getState().commit(result) && piece) useToast.getState().show(t("itemRefused", typeName(piece.type)));
  };
  return (
    <View style={styles.root}>
      <PlanCanvas scene={scene} selectedId={selectedId} topInset={insets.top + 110} bottomInset={heights[snap]} onSelect={useEditor.getState().select} onPlace={place} />
      <View style={[styles.top, { top: insets.top + 9 }]}><EditorHeader name={name} /></View>
      <View style={[styles.chips, { top: insets.top + 59 }]}><RoomCheckChip score={score} rules={rules} onPress={() => useEditor.getState().setTab("check")} /></View>
      <Toast top={insets.top + 113} />
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetTabs tabs={TABS} value={tab} onChange={useEditor.getState().setTab} />
        <ScrollView contentContainerStyle={styles.pane}><Pane /></ScrollView>
      </Sheet>
    </View>
  );
}

/** The room editor: the room on a plan, the design's header and room-check chip, and the sheet with its tabs. */
export function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useRooms((s) => s.rooms.find((r) => r.id === id));
  const open = useEditor((s) => s.roomId === id && !!s.history);
  useEffect(() => {
    const found = useRooms.getState().rooms.find((r) => r.id === id);
    if (found && !(useEditor.getState().roomId === id && useEditor.getState().history)) useEditor.getState().open(found.id, found.scene);
  }, [id]);
  if (!room) return <RoomGone />;
  return open ? <EditorBody name={room.name} /> : null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  top: { position: "absolute", start: 12, end: 12, zIndex: 20 },
  chips: { position: "absolute", start: 14, end: 14, zIndex: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pane: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 30 },
});
