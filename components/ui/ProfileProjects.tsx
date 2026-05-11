import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
};

function ProjectCard({ project }: { project: Project }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>{project.title}</Text>

        <Text style={{ fontSize: 12, opacity: 0.6 }}>{project.status}</Text>
      </View>

      <Text style={{ marginTop: 8, opacity: 0.8 }}>{project.description}</Text>
    </View>
  );
}

export default function ProfileProjects({ userId }: { userId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (userId) FetchProjects();
  }, [userId]);

  async function FetchProjects() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) setProjects(data as Project[]);
  }

  async function AddProject() {
    if (!title.trim()) return;

    const { data } = await supabase
      .from("projects")
      .insert([
        {
          user_id: userId,
          title,
          description,
          status: "building",
        },
      ])
      .select()
      .single();

    if (data) {
      setProjects([data as Project, ...projects]);
      setTitle("");
      setDescription("");
    }
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        Projects
      </Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Project title"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
          marginBottom: 10,
        }}
      />

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="What are you building?"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
          height: 100,
          marginBottom: 10,
        }}
      />

      <Pressable
        onPress={AddProject}
        style={{
          backgroundColor: "black",
          padding: 12,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>Add Project</Text>
      </Pressable>

      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </ScrollView>
  );
}
