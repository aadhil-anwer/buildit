import { getWalls, type Scene } from "@buildit/core";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { PlanView } from "@/components/plan-view";
import { Text } from "@/components/text";
import { formatFixed, t, type StringKey } from "@/i18n";
import { planGeometry, wallLabels } from "@/rooms/plan";
import { color } from "@/theme";

const HEIGHT = 296;
const SIDE: Record<string, StringKey> = { north: "wallN", east: "wallE", south: "wallS", west: "wallW" };

/** The room from above at full width, with each wall's length as a tappable label. */
export function ReviewPlan({ scene, onWall }: { scene: Scene; onWall: (wall: number) => void }) {
  const { width } = useWindowDimensions();
  const walls = getWalls(scene.room);
  const labels = wallLabels(planGeometry(scene, width, HEIGHT, 56).corners);
  return (
    <View style={styles.root}>
      <PlanView scene={scene} width={width} height={HEIGHT} pad={56} />
      {labels.map(({ wall, x, y }) => {
        const length = `${formatFixed(walls[wall].length, 2)} ${t("m")}`;
        return (
          // The drawing is a plan of the real room, so it is never mirrored: these positions are physical, not start/end.
          // eslint-disable-next-line no-restricted-syntax -- physical placement over a physical drawing
          <Pressable key={wall} accessibilityRole="button" accessibilityLabel={`${t(SIDE[walls[wall].side])}. ${t("wallLen")} ${length}`} onPress={() => onWall(wall)} style={[styles.hit, { left: x - 42, top: y - 22 }]}>
            <View style={styles.pill}>
              <Text variant="dim">{length}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: HEIGHT, marginTop: 6 },
  hit: { position: "absolute", width: 84, height: 44, alignItems: "center", justifyContent: "center" },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: color.divider, borderRadius: 99, backgroundColor: color.bg },
});
