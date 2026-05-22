import React, { useRef, useState } from "react";

import { ScrollView, StatusBar, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

import FloatingSectionNav from "@/components/ui/FloatingSectionNav";
import OfferCard from "@/components/ui/OfferCard";
import ProjectCard from "@/components/ui/ProjectCard";
import SectionHeader from "@/components/ui/SectionHeader";
import ShareBar from "@/components/ui/ShareBar";
import StreakCard from "@/components/ui/StreakCard";

export default function FeedScreen() {
  const { colors, spacing, statusBarStyle } = useTheme();

  const scrollRef = useRef<ScrollView>(null);

  const [active, setActive] = useState("hive");

  const jumpTo = (section: string) => {
    setActive(section);

    const positions: Record<string, number> = {
      hive: 0,
      cohort: 760,
      global: 1450,
    };

    scrollRef.current?.scrollTo({
      y: positions[section],
      animated: true,
    });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.canvas,
      }}
    >
      <StatusBar barStyle={`${statusBarStyle}-content`} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 140,
        }}
      >
        <SectionHeader title="Hive" subtitle="Following · All cohorts" />

        <View
          style={{
            padding: spacing.base,
          }}
        >
          <ShareBar />

          <OfferCard />

          <ProjectCard />
        </View>

        <SectionHeader title="My Cohort" subtitle="24 members" />

        <View
          style={{
            paddingHorizontal: spacing.base,
          }}
        >
          <ProjectCard />

          <StreakCard />
        </View>

        <SectionHeader title="Global" subtitle="Locked" />

        <View
          style={{
            height: 120,
          }}
        />
      </ScrollView>

      <FloatingSectionNav active={active} onPress={jumpTo} />
    </View>
  );
}
