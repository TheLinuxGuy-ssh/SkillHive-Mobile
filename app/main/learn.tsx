import { CourseCard } from "@/components/ui/CourseCard";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface Courses {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  total_weeks: number;
  is_published: boolean;
  author: string;
  profiles: {
    displayname: string;
    avatar: string;
  };
}

const Learn = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const [courses, setCourses] = useState<Courses[]>([]);
  useEffect(() => {
    const loadCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, profiles (displayname, avatar)");
      if (!error) {
        setCourses(data);
      } else {
        console.log("error fetching courses");
      }
    };
    loadCourses();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.muted }]}>
      <Animated.ScrollView style={{ margin: 10 }}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            title={course.title}
            instructor="someone"
            // instructor={course.profiles.displayname}
            onPress={() => router.push("/course")}
            description={course.description}
            progress={23}
            enrolledCount={312}
            lessonCount={10}
            isNew={true}
            thumbnail={require("@/assets/images/course.jpg")}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
  },
});

export default Learn;
