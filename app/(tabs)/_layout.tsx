import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import NavigationMenu from "../../src/components/navigation/NavigationMenu";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { spacing, typography } from "../../src/theme/tokens";

function HeaderRight() {
  const theme = useAppTheme();

  return (
    <View style={styles.headerContent}>
      <Text style={[styles.appName, { color: theme.colors.primary }]}>
        Maç Servisi
      </Text>
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
          options={{
            title: t("navigation.home"),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: t("navigation.favorites"),
          }}
        />
        <Tabs.Screen
          name="leagues"
          options={{
            title: t("navigation.leagues"),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t("navigation.settings"),
          }}
        />
      </Tabs>
    </NavigationMenu>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  appName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5,
  },
});
