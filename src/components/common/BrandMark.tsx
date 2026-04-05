import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { typography } from "../../theme/tokens";

export default function BrandMark() {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      <Text
        style={[styles.name, { color: theme.colors.primary }]}
        allowFontScaling={false}
      >
        Maç Servisi
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -0.3,
  },
});
