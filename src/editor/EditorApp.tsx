"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { deleteSelected, rotateSelected } from "./actions";
import { CatalogPanel } from "./components/CatalogPanel";
import { ChatPanel } from "./components/ChatPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { Inspector } from "./components/Inspector";
import { IssuesBar } from "./components/IssuesBar";
import { NewRoomDialog, openScene } from "./components/NewRoomDialog";
import { RoomPanel } from "./components/RoomPanel";
import { TopBar } from "./components/TopBar";
import { Icon } from "./components/ui";
import { lastProjectId, sceneFromHash } from "./persist";
import { reopen, startAutosave, useEditor } from "./store";
import { useLayoutAnalysis } from "./useLayoutAnalysis";

const Viewport = dynamic(() => import("./components/Viewport").then((m) => m.Viewport), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-stone-500">Loading 3D…</div>,
});

type Tab = "chat" | "add" | "room" | "history";

const TAB_LABEL: Record<Tab, { label: string; icon: string }> = {
  chat: { label: "Designer", icon: "chat" },
  add: { label: "Add", icon: "sofa" },
  room: { label: "Room", icon: "room" },
  history: { label: "History", icon: "history" },
};

function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex shrink-0 border-b border-stone-200 bg-paper">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${
            active === t ? "border-b-2 border-accent text-accent" : "border-b-2 border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Icon name={TAB_LABEL[t].icon} className="h-3.5 w-3.5" /> {TAB_LABEL[t].label}
        </button>
      ))}
    </div>
  );
}

function Toast() {
  const toast = useEditor((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast || !visible) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="max-w-md rounded-xl bg-stone-900/90 px-4 py-2 text-center text-sm text-white shadow-lg">{toast.text}</div>
    </div>
  );
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
}

export function EditorApp() {
  const [ready, setReady] = useState(false);
  const [newRoom, setNewRoom] = useState(false);
  const [sideTab, setSideTab] = useState<Tab>("add");
  const [mobileTab, setMobileTab] = useState<Tab>("chat");
  const scene = useEditor((s) => s.scene);
  const dragging = useEditor((s) => s.dragging);
  const aiBusy = useEditor((s) => s.aiBusy);
  const report = useLayoutAnalysis(scene, dragging);
  const problemIds = useMemo(
    () => new Set((report?.issues ?? []).filter((i) => i.severity === "error").flatMap((i) => i.objectIds)),
    [report],
  );

  useEffect(() => {
    const shared = sceneFromHash(window.location.hash);
    if (shared) {
      openScene(shared, "Opened shared room");
      window.history.replaceState(null, "", window.location.pathname);
      useEditor.getState().showToast("Opened a shared room. Your copy is saved in this browser.");
    } else {
      const last = lastProjectId();
      if (last) reopen(last);
    }
    const stop = startAutosave();
    setReady(true);
    return stop;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const st = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (mod || st.aiBusy) return;
      if (e.key === "Escape") st.select(null);
      if (!st.selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "r" || e.key === "R") {
        rotateSelected(e.shiftKey ? -90 : 90);
      } else if (e.key === "q" || e.key === "Q") {
        rotateSelected(15);
      } else if (e.key === "e" || e.key === "E") {
        rotateSelected(-15);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready) {
    return <div className="flex h-dvh items-center justify-center text-sm text-stone-500">Loading BuildIt…</div>;
  }

  const panel = (t: Tab): ReactNode =>
    t === "chat" ? <ChatPanel /> : t === "add" ? <CatalogPanel /> : t === "room" ? <RoomPanel onNewRoom={() => setNewRoom(true)} /> : <HistoryPanel />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar onNewRoom={() => setNewRoom(true)} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[300px] shrink-0 flex-col border-r border-stone-200 bg-paper lg:flex">
          <Tabs tabs={["add", "room", "history"]} active={sideTab} onChange={setSideTab} />
          <div className="min-h-0 flex-1">{panel(sideTab)}</div>
        </aside>

        <main className="relative min-w-0 flex-1 bg-canvas">
          <Viewport report={report?.clearance ?? null} problemIds={problemIds} />
          <div className="pointer-events-none absolute left-3 right-3 top-3 z-10">
            <IssuesBar report={report} />
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex">
            <Inspector issues={report?.issues ?? []} />
          </div>
          {aiBusy && <div className="pointer-events-none absolute inset-0 z-0 ring-4 ring-inset ring-accent/40" />}
          <Toast />
        </main>

        <aside className="hidden w-[380px] shrink-0 border-l border-stone-200 lg:block">
          <ChatPanel />
        </aside>
      </div>

      <div className="flex h-[44dvh] shrink-0 flex-col border-t border-stone-200 bg-paper lg:hidden">
        <Tabs tabs={["chat", "add", "room", "history"]} active={mobileTab} onChange={setMobileTab} />
        <div className="min-h-0 flex-1">{panel(mobileTab)}</div>
      </div>

      {newRoom && <NewRoomDialog onClose={() => setNewRoom(false)} />}
    </div>
  );
}
