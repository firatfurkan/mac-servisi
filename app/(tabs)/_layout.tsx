import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import BrandMark from "../../src/components/common/BrandMark";
import NavigationMenu from "../../src/components/navigation/NavigationMenu";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { spacing } from "../../src/theme/tokens";

function HeaderRight() {
  return (
    <View style={styles.headerContent}>
      <BrandMark />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <NavigationMenu>
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: true,
          headerTitle: "",
          headerLeft: () => null,
          headerRight: () => <HeaderRight />,
          headerStyle: {
            backgroundColor: theme.colors.surface,
            shadowColor: "transparent",
            elevation: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.divider,
          } as any,
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t("navigation.home"), headerTitle: "" }}
        />
        <Tabs.Screen
          name="favorites"
          options={{ title: t("navigation.favorites"), headerTitle: "" }}
        />
        <Tabs.Screen
          name="leagues"
          options={{ title: t("navigation.leagues"), headerTitle: "" }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: t("navigation.settings"), headerTitle: "" }}
        />
      </Tabs>
    </NavigationMenu>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    marginRight: spacing.lg,
  },
});
