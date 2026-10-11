import { View, type ViewProps } from "react-native";
import { color } from "@/theme";

export const Hairline = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[{ height: 1, backgroundColor: color.divider }, style]} />
);
