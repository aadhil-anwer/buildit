import { ROOM_KINDS, type RoomKind } from "@buildit/core";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { buildRoom, RANGE, type DimensionsForm, type FormErrors, type Wall } from "@/capture/dimensions";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { IconButton } from "@/components/icon-button";
import { Text } from "@/components/text";
import { TextField } from "@/components/text-field";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { kindFromName, kindName } from "@/rooms/kind";
import { useRooms } from "@/rooms/store";
import { useSettings } from "@/settings/store";

const WALLS = [["north", "wallN"], ["east", "wallE"], ["south", "wallS"], ["west", "wallW"]] as const;

function WallChips({ label, value, onChange, none }: { label: string; value: Wall | null; onChange: (wall: Wall | null) => void; none?: string }) {
  return (
    <View style={styles.group}>
      <Text variant="caption" tone="secondary">{label}</Text>
      <View style={styles.chips}>
        {none ? <Chip label={none} selected={value === null} onPress={() => onChange(null)} /> : null}
        {WALLS.map(([wall, key]) => <Chip key={wall} label={t(key)} selected={value === wall} onPress={() => onChange(wall)} />)}
      </View>
    </View>
  );
}

function KindChips({ value, onChange }: { value: RoomKind | null; onChange: (kind: RoomKind | null) => void }) {
  return (
    <View style={styles.group}>
      <Text variant="caption" tone="secondary">{t("furnishH")}</Text>
      <View style={styles.chips}>
        {ROOM_KINDS.map((k) => <Chip key={k} label={kindName(k)} selected={value === k} onPress={() => onChange(k)} />)}
        <Chip label={t("kindEmpty")} selected={value === null} onPress={() => onChange(null)} />
      </View>
    </View>
  );
}

/** The room's kind and name keep each other in step until the person sets one themselves. */
function useKindAndName(initial: string) {
  const [kind, setKind] = useState<RoomKind | null>(kindFromName(initial));
  const [touched, setTouched] = useState({ kind: false, name: false });
  const pickKind = (k: RoomKind | null, setName: (n: string) => void) => {
    setKind(k);
    setTouched((s) => ({ ...s, kind: true }));
    if (k && !touched.name) setName(kindName(k)); // an untouched name follows the kind
  };
  const typeName = (name: string) => {
    setTouched((s) => ({ ...s, name: true }));
    if (!touched.kind) setKind(kindFromName(name) ?? kind); // "Master bed" picks Bedroom until the person chooses
  };
  return { kind, pickKind, typeName };
}

/** Type the room in: what it is, name, three sizes, and which walls the door and window are on. Creating it opens the editor furnishing it. */
export function Dimensions() {
  const router = useRouter();
  const insets = useScreenInsets();
  const add = useRooms((s) => s.add);
  const walkwayCm = useSettings((s) => s.walkwayCm);
  const [form, setForm] = useState<DimensionsForm>({ name: t("rBed"), width: "", length: "", height: "2.8", door: "south", window: null });
  const [errors, setErrors] = useState<FormErrors>({});
  const room = useKindAndName(form.name);
  const set = <K extends keyof DimensionsForm>(key: K) => (value: DimensionsForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const result = buildRoom(form);
    if ("errors" in result) return setErrors(result.errors);
    const scene = { ...result.scene, constraints: { ...result.scene.constraints, minWalkway: walkwayCm / 100 } };
    const id = add(scene.room.name, scene);
    // A typed room needs no review (it is exactly what was typed): straight to the editor, furnishing it if a kind was picked.
    router.replace(room.kind ? `/editor/${id}?furnish=${room.kind}` : `/editor/${id}`);
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top - 4, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.back}>
        <IconButton icon="back" label={t("back")} onPress={() => router.back()} />
      </View>
      <Text variant="hero" style={styles.title}>{t("way3t")}</Text>
      <Text variant="bodySm" tone="secondary" style={styles.hint}>{t("dimHint")}</Text>
      <KindChips value={room.kind} onChange={(k) => room.pickKind(k, set("name"))} />
      <TextField label={t("dimName")} value={form.name} onChangeText={(v) => { set("name")(v); room.typeName(v); }} error={errors.name ? t("dimNameRequired") : undefined} />
      <View style={styles.sizes}>
        <View style={styles.half}><TextField label={t("dimWidth")} value={form.width} onChangeText={set("width")} keyboardType="decimal-pad" error={errors.width ? t("dimRangeSize", ...RANGE.size) : undefined} /></View>
        <View style={styles.half}><TextField label={t("dimLength")} value={form.length} onChangeText={set("length")} keyboardType="decimal-pad" error={errors.length ? t("dimRangeSize", ...RANGE.size) : undefined} /></View>
      </View>
      <TextField label={t("dimHeight")} value={form.height} onChangeText={set("height")} keyboardType="decimal-pad" error={errors.height ? t("dimRangeHeight", ...RANGE.height) : undefined} />
      <WallChips label={t("dimDoor")} value={form.door} onChange={(wall) => set("door")(wall ?? "south")} />
      <WallChips label={t("dimWindow")} value={form.window} onChange={set("window")} none={t("winNone")} />
      {errors.openings ? <Text variant="caption" tone="danger" accessibilityRole="alert">{t("dimOpenings")}</Text> : null}
      <Button title={t("dimCreate")} size={16} onPress={submit} style={styles.create} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, gap: 16 },
  back: { height: 48, flexDirection: "row", alignItems: "center" },
  title: { marginTop: 14 },
  hint: { marginTop: -8, marginBottom: 6 },
  sizes: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  group: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  create: { marginTop: 8 },
});
