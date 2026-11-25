import { analyzeClearance, ROOM_KINDS, type OpResult, type RoomKind } from "@buildit/core";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Sheet } from "@/components/sheet";
import { fitHeights, type Snap } from "@/components/sheet-snap";
import { Toast, useToast } from "@/components/toast";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { useWindowDimensions } from "react-native";
import { useFail } from "@/lib/use-fail";
import { EditorHeader } from "@/editor/header";
import { fixLayout } from "@/editor/fix";
import { PlanCanvas } from "@/editor/plan-canvas";
import { FurnishCard } from "@/editor/furnish-card";
import { useFurnish } from "@/editor/furnish-store";
import { report } from "@/lib/report";
import { SelectionBar } from "@/editor/selection-bar";
import { SuggestionCard } from "@/editor/suggestion-card";
import { RoomCanvas } from "@/editor/scene3d/room-canvas";
import { AddPane } from "@/editor/panes/add-pane";
import { AskPane } from "@/editor/panes/ask-pane";
import { CheckPane } from "@/editor/panes/check-pane";
import { FinishesPane } from "@/editor/panes/finishes-pane";
import { ItemPane } from "@/editor/panes/item-pane";
import { ChipsRow } from "@/editor/chips-row";
import { DOCK_HEIGHT, Dock } from "@/editor/dock";
import { useFirstHint } from "@/editor/use-first-hint";
import { useRoomComplete } from "@/editor/use-room-complete";
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

/** The sheet is closed until a dock button opens it; dragging it below half closes it again. */
function useSheet() {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snap>("half");
  const tab = useEditor((s) => s.tab);
  useEffect(() => void (tab === "check" && setOpen(true)), [tab]); // the room-check chip opens the check
  const onDock = (key: EditorTab) => {
    const same = open && useEditor.getState().tab === key;
    useEditor.getState().setTab(key);
    setOpen(!same);
    setSnap("half");
  };
  const onSnapChange = (next: Snap) => (next === "peek" ? setOpen(false) : setSnap(next));
  return { open, snap, tab, onDock, onSnapChange, close: () => setOpen(false) };
}

/** The room in 3D or on a plan. The 3D canvas keeps its size under the sheet (native GL does not resize cleanly); the plan shrinks to what is left. */
function EditorCanvas({ top, dock, covered, onDeselect }: { top: number; dock: number; covered: number; onDeselect: () => void }) {
  const scene = useScene();
  const [selectedId, view, walkOn] = [useEditor((s) => s.selectedId), useEditor((s) => s.view), useEditor((s) => s.walk)];
  const walk = useMemo(() => (walkOn ? analyzeClearance(scene, { cell: 0.05, overlay: true }) : null), [scene, walkOn]);
  const place = (id: string, result: OpResult) => {
    const piece = scene.objects.find((o) => o.id === id);
    if (!useEditor.getState().commit(result) && piece) useToast.getState().show(t("itemRefused", typeName(piece.type)));
  };
  const select = (id: string | null) => {
    useEditor.getState().select(id);
    if (!id) onDeselect(); // a tap on bare floor gives the whole room back
  };
  const common = { scene, selectedId, topInset: top, walk, onSelect: select, onPlace: place };
  return view === "3d" ? <RoomCanvas {...common} bottomInset={dock} sheet={covered - dock} /> : <PlanCanvas {...common} bottomInset={covered} />;
}

function EditorBody({ name }: { name: string }) {
  const insets = useScreenInsets();
  const { fixing, fix } = useFix();
  useFirstHint();
  useRoomComplete();
  const sheet = useSheet();
  const selectedId = useEditor((s) => s.selectedId);
  const dock = DOCK_HEIGHT + insets.bottom;
  const heights = fitHeights(useWindowDimensions().height - dock, insets.top + 24);
  const covered = dock + (sheet.open ? heights[sheet.snap] : 0);
  const pane: Record<EditorTab, () => React.JSX.Element> = { tAsk: () => <AskPane onFix={() => void fix()} />, tAdd: AddPane, tItem: ItemPane, tFin: FinishesPane, check: () => <CheckPane onFix={() => void fix()} fixing={fixing} /> };
  const Pane = pane[sheet.tab];
  return (
    <View style={styles.root}>
      <EditorCanvas top={insets.top + 98} dock={dock} covered={covered} onDeselect={sheet.close} />
      <View style={[styles.top, { top: insets.top - 4 }]}><EditorHeader name={name} /></View>
      <View style={[styles.chips, { top: insets.top + 46 }]}><ChipsRow /></View>
      {sheet.open ? null : <SelectionBar bottom={covered + 10} />}
      {sheet.open ? null : <SuggestionCard bottom={covered + (selectedId ? 70 : 10)} />}
      {sheet.open ? null : <FurnishCard bottom={covered + 10} onOwn={() => sheet.onDock("tAdd")} />}
      <Toast top={insets.top + 100} />
      {sheet.open ? (
        <Sheet snap={sheet.snap} onSnapChange={sheet.onSnapChange} bottom={dock}>
          <ScrollView contentContainerStyle={styles.pane}><Pane /></ScrollView>
        </Sheet>
      ) : null}
      <Dock open={sheet.open ? sheet.tab : null} onPress={sheet.onDock} inset={insets.bottom} />
    </View>
  );
}

/** A room created with a kind ("…?furnish=bedroom") furnishes itself once the empty room has been seen for a moment. */
function useAutoFurnish(open: boolean, kind: string | undefined) {
  const done = useRef(false);
  useEffect(() => {
    if (!open || done.current || !(ROOM_KINDS as readonly string[]).includes(kind ?? "")) return;
    if (useEditor.getState().history?.present.objects.length) return; // already furnished (came back to it)
    useFurnish.getState().setPending(true);
    const timer = setTimeout(() => {
      done.current = true; // set when it really starts, so a cancelled timer (a re-run) can try again
      useFurnish.getState().furnish(kind as RoomKind).catch((e: unknown) => report(e, { source: "furnish", kind }));
    }, 700);
    return () => {
      clearTimeout(timer);
      useFurnish.getState().setPending(false);
    };
  }, [open, kind]);
}

/** The room editor: the room on a plan, the design's header and room-check chip, and the sheet with its tabs. */
export function Editor() {
  const { id, tab, select, furnish } = useLocalSearchParams<{ id: string; tab?: string; select?: string; furnish?: string }>();
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
  useAutoFurnish(open, furnish);
  if (!room) return <RoomGone />;
  return open ? <EditorBody name={room.name} /> : null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  top: { position: "absolute", start: 12, end: 12, zIndex: 20 },
  chips: { position: "absolute", start: 14, end: 14, zIndex: 15 },
  pane: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 30 },
});
