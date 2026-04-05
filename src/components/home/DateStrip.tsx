import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useMatchStore } from "../../stores/matchStore";
import { getAppDate } from "../../utils/dateUtils";

const DAYS_VISIBLE = 5;

export default function DateStrip() {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const { selectedDate, setSelectedDate } = useMatchStore();

  const today = getAppDate().format("YYYY-MM-DD");

  const [pageStart, setPageStart] = useState(() =>
    getAppDate().subtract(2, "day").format("YYYY-MM-DD"),
  );

  // Calendar picker state (for native)
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => dayjs(selectedDate));

  const dates = Array.from({ length: DAYS_VISIBLE }, (_, i) =>
    dayjs(pageStart).add(i, "day").format("YYYY-MM-DD"),
  );

  // When selected date is outside the window, shift window
  React.useEffect(() => {
    const idx = dates.indexOf(selectedDate);
    if (idx < 0) {
      setPageStart(dayjs(selectedDate).subtract(2, "day").format("YYYY-MM-DD"));
    }
  }, [selectedDate]);

  function prevPage() {
    setPageStart((prev) =>
      dayjs(prev).subtract(DAYS_VISIBLE, "day").format("YYYY-MM-DD"),
    );
  }

  function nextPage() {
    setPageStart((prev) =>
      dayjs(prev).add(DAYS_VISIBLE, "day").format("YYYY-MM-DD"),
    );
  }

  function goToday() {
    const newStart = getAppDate().subtract(2, "day").format("YYYY-MM-DD");
    setPageStart(newStart);
    setSelectedDate(today);
  }

  function getLabel(date: string): { top: string; bottom: string } {
    const d = dayjs(date).locale(i18n.language);
    const bottom = d.format("DD MMM");
    const yesterday = getAppDate().subtract(1, "day").format("YYYY-MM-DD");
    const tomorrow = getAppDate().add(1, "day").format("YYYY-MM-DD");
    if (date === today) return { top: t("home.today"), bottom };
    if (date === yesterday) return { top: t("home.yesterday"), bottom };
    if (date === tomorrow) return { top: t("home.tomorrow"), bottom };
    return { top: d.format("ddd"), bottom };
  }

  const openCalendar = useCallback(() => {
    setCalendarMonth(dayjs(selectedDate));
    setShowCalendar(true);
  }, [selectedDate]);

  const handleDatePick = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      setPageStart(dayjs(dateStr).subtract(2, "day").format("YYYY-MM-DD"));
      setShowCalendar(false);
    },
    [setSelectedDate],
  );

  const isOnCurrentPage = dates.includes(today);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const start = calendarMonth.startOf("month");
    const daysInMonth = calendarMonth.endOf("month").date();
    const startDay = start.day(); // 0=Sun, 1=Mon, ...
    const offset = (startDay + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
    const weeks: (string | null)[][] = [];
    let week: (string | null)[] = [];
    for (let i = 0; i < offset; i++) week.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(calendarMonth.date(d).format("YYYY-MM-DD"));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [calendarMonth]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.divider,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Prev */}
        <TouchableOpacity
          onPress={prevPage}
          activeOpacity={0.6}
          style={styles.arrowBtn}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Days */}
        <View style={styles.daysRow}>
          {dates.map((date) => {
            const isSelected = date === selectedDate;
            const isTodayDate = date === today;
            const { top, bottom } = getLabel(date);
            return (
              <TouchableOpacity
                key={date}
                onPress={() => setSelectedDate(date)}
                style={[
                  styles.dateItem,
                  isSelected && {
                    backgroundColor: theme.colors.primary,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3,
                  },
                  isTodayDate &&
                    !isSelected && {
                      backgroundColor: theme.colors.primary + "22",
                    },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: isSelected
                        ? "#fff"
                        : isTodayDate
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                    },
                  ]}
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                >
                  {top}
                </Text>
                <Text
                  style={[
                    styles.dateLabel,
                    {
                      color: isSelected
                        ? "#fff"
                        : isTodayDate
                          ? theme.colors.primary
                          : theme.colors.textPrimary,
                    },
                    (isSelected || isTodayDate) && { fontWeight: "700" },
                  ]}
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                >
                  {bottom}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next */}
        <TouchableOpacity
          onPress={nextPage}
          activeOpacity={0.6}
          style={styles.arrowBtn}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Divider */}
        <View
          style={[styles.divider, { backgroundColor: theme.colors.divider }]}
        />

        {/* Calendar icon */}
        <TouchableOpacity
          onPress={openCalendar}
          activeOpacity={0.6}
          style={styles.calendarBtn}
        >
          <Ionicons
            name="calendar-outline"
            size={22}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Today button — only shown when today is not in view */}
      {!isOnCurrentPage && (
        <TouchableOpacity
          onPress={goToday}
          activeOpacity={0.7}
          style={[styles.todayBtn, { borderColor: theme.colors.primary }]}
        >
          <Text
            style={[styles.todayBtnText, { color: theme.colors.primary }]}
            maxFontSizeMultiplier={1.1}
          >
            {t("home.today")}
          </Text>
        </TouchableOpacity>
      )}

      {/* Calendar modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCalendar(false)}
        >
          <Pressable
            style={[
              styles.calendarModal,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth((prev) => prev.subtract(1, "month"))
                }
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.calendarTitle,
                  { color: theme.colors.textPrimary },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {calendarMonth.locale(i18n.language).format("MMMM YYYY")}
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarMonth((prev) => prev.add(1, "month"))}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekRow}>
              {Array.from({ length: 7 }, (_, i) =>
                dayjs()
                  .day((i + 1) % 7)
                  .locale(i18n.language)
                  .format("dd"),
              ).map((d, i) => (
                <Text
                  key={i}
                  style={[
                    styles.calendarWeekDay,
                    { color: theme.colors.textSecondary },
                  ]}
                  maxFontSizeMultiplier={1.0}
                >
                  {d}
                </Text>
              ))}
            </View>

            {calendarDays.map((week, wi) => (
              <View key={wi} style={styles.calendarWeekRow}>
                {week.map((day, di) => {
                  if (!day)
                    return <View key={di} style={styles.calendarDayCell} />;
                  const isSelected = day === selectedDate;
                  const isTodayDay = day === today;
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        styles.calendarDayCell,
                        isSelected && {
                          backgroundColor: theme.colors.primary,
                          borderRadius: 20,
                        },
                        isTodayDay &&
                          !isSelected && {
                            backgroundColor: theme.colors.primary + "22",
                            borderRadius: 20,
                          },
                      ]}
                      onPress={() => handleDatePick(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          {
                            color: isSelected
                              ? "#fff"
                              : isTodayDay
                                ? theme.colors.primary
                                : theme.colors.textPrimary,
                          },
                          isSelected && { fontWeight: "700" },
                        ]}
                        maxFontSizeMultiplier={1.2}
                      >
                        {dayjs(day).date()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity
              onPress={() => handleDatePick(today)}
              style={[
                styles.calendarTodayBtn,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text
                style={styles.calendarTodayBtnText}
                maxFontSizeMultiplier={1.1}
              >
                {t("home.today")}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 2,
    paddingRight: 4,
    paddingTop: 8,
  },
  arrowBtn: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  daysRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateItem: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    minHeight: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  todayBtn: {
    alignSelf: "center",
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 28,
    marginHorizontal: 4,
  },
  calendarBtn: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    position: "relative",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarModal: {
    width: 320,
    borderRadius: 16,
    padding: 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  calendarWeekDay: {
    width: 40,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  calendarDayCell: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayText: {
    fontSize: 14,
  },
  calendarTodayBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  calendarTodayBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
