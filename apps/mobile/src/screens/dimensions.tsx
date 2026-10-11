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

/** Type the room in: name, three sizes, and which walls the door and window are on. */
export function Dimensions() {
  const router = useRouter();
  const insets = useScreenInsets();
  const add = useRooms((s) => s.add);
  const walkwayCm = useSettings((s) => s.walkwayCm);
  const [form, setForm] = useState<DimensionsForm>({ name: t("rBed"), width: "", length: "", height: "2.8", door: "south", window: null });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = <K extends keyof DimensionsForm>(key: K) => (value: DimensionsForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const result = buildRoom(form);
    if ("errors" in result) return setErrors(result.errors);
    const scene = { ...result.scene, constraints: { ...result.scene.constraints, minWalkway: walkwayCm / 100 } };
    router.replace(`/review/${add(scene.room.name, scene)}`);
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top - 4, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.back}>
        <IconButton icon="back" label={t("back")} onPress={() => router.back()} />
      </View>
      <Text variant="hero" style={styles.title}>{t("way3t")}</Text>
      <Text variant="bodySm" tone="secondary" style={styles.hint}>{t("dimHint")}</Text>
      <TextField label={t("dimName")} value={form.name} onChangeText={set("name")} error={errors.name ? t("dimNameRequired") : undefined} />
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
