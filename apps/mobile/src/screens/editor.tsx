import { analyzeClearance, type OpResult } from "@buildit/core";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { SuggestionCard } from "@/editor/suggestion-card";
import { RoomCanvas } from "@/editor/scene3d/room-canvas";
import { AddPane } from "@/editor/panes/add-pane";
import { AskPane } from "@/editor/panes/ask-pane";
import { CheckPane } from "@/editor/panes/check-pane";
import { FinishesPane } from "@/editor/panes/finishes-pane";
import { ItemPane } from "@/editor/panes/item-pane";
import { ChipsRow } from "@/editor/chips-row";
import { useEditor, useScene, type EditorTab } from "@/editor/store";
import { typeName } from "@/rooms/names";
import { useRooms } from "@/rooms/store";
import { RoomGone } from "./room-gone";

const TAB_KEYS = ["tAsk", "tAdd", "tItem", "tFin"] as const;

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
  const { fixing, fix } = useFix();
  const [snap, setSnap] = useState<Snap>("half");
  const [tab, selectedId, view, walkOn] = [useEditor((s) => s.tab), useEditor((s) => s.selectedId), useEditor((s) => s.view), useEditor((s) => s.walk)];
  const walk = useMemo(() => (walkOn ? analyzeClearance(scene, { cell: 0.05, overlay: true }) : null), [scene, walkOn]);
  const Canvas = view === "3d" ? RoomCanvas : PlanCanvas;
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
      <Canvas scene={scene} selectedId={selectedId} topInset={insets.top + 98} bottomInset={heights[snap]} walk={walk} onSelect={useEditor.getState().select} onPlace={place} />
      <View style={[styles.top, { top: insets.top - 4 }]}><EditorHeader name={name} /></View>
      <View style={[styles.chips, { top: insets.top + 46 }]}><ChipsRow /></View>
      <SuggestionCard top={insets.top + 98} />
      <Toast top={insets.top + 100} />
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetTabs tabs={TAB_KEYS.map((key) => ({ key, label: t(key) }))} value={tab} onChange={useEditor.getState().setTab} />
        <ScrollView contentContainerStyle={styles.pane}><Pane /></ScrollView>
      </Sheet>
    </View>
  );
}

/** The room editor: the room on a plan, the design's header and room-check chip, and the sheet with its tabs. */
export function Editor() {
  const { id, tab, select } = useLocalSearchParams<{ id: string; tab?: string; select?: string }>();
  const room = useRooms((s) => s.rooms.find((r) => r.id === id));
  const open = useEditor((s) => s.roomId === id && !!s.history);
  useEffect(() => {
    const found = useRooms.getState().rooms.find((r) => r.id === id);
    const editor = useEditor.getState();
    if (found && !(editor.roomId === id && editor.history)) editor.open(found.id, found.scene);
    // Deep links (and the design comparison) can open on a given tab with a piece selected.
    if (tab === "check" || (TAB_KEYS as readonly string[]).includes(tab ?? "")) editor.setTab(tab as EditorTab);
    if (select) editor.select(select);
  }, [id, tab, select]);
  if (!room) return <RoomGone />;
  return open ? <EditorBody name={room.name} /> : null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  top: { position: "absolute", start: 12, end: 12, zIndex: 20 },
  chips: { position: "absolute", start: 14, end: 14, zIndex: 15 },
  pane: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 30 },
});
