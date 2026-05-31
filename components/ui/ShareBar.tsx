import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePickerLib from "expo-image-picker";

import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  DollarSign,
  FileText,
  Image as ImageIcon,
  MapPin,
  Plus,
  X,
} from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

type PostType = "project" | "media" | "offer";
type OfferType = "full_time" | "part_time" | "internship" | "contract";

type Props = {
  initials?: string;
  onPosted?: () => void;
};

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const POST_TYPES: {
  value: PostType;
  label: string;
  Icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
  hint: string;
}[] = [
  { value: "project", label: "Project", Icon: Briefcase, hint: "Share something you built"  },
  { value: "media",   label: "Media",   Icon: Camera,    hint: "Photo or video update"       },
  { value: "offer",   label: "Offer",   Icon: FileText,  hint: "Job offer or opportunity"    },
];

const OFFER_TYPES: { value: OfferType; label: string }[] = [
  { value: "full_time",   label: "Full-Time"   },
  { value: "part_time",   label: "Part-Time"   },
  { value: "internship",  label: "Internship"  },
  { value: "contract",    label: "Contract"    },
];

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

export default function ShareBar({ initials = "ME", onPosted }: Props) {
  const { colors, spacing, radii, typography } = useTheme();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints     = useMemo(() => ["72%", "96%"], []);

  // ── field refs for keyboard chaining ──
  const captionRef     = useRef<TextInput>(null);
  const titleRef       = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const companyRef     = useRef<TextInput>(null);
  const roleRef        = useRef<TextInput>(null);
  const salaryRef      = useRef<TextInput>(null);
  const locationRef    = useRef<TextInput>(null);

  // ── shared state ──
  const [posting,  setPosting]  = useState(false);
  const [postType, setPostType] = useState<PostType>("project");
  const [caption,  setCaption]  = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  // ── project state ──
  const [title,            setTitle]            = useState("");
  const [description,      setDescription]      = useState("");
  const [currentlyWorking, setCurrentlyWorking] = useState(true);
  const [startedAt,        setStartedAt]        = useState<Date | null>(new Date());
  const [endedAt,          setEndedAt]          = useState<Date | null>(null);
  const [showStartPicker,  setShowStartPicker]  = useState(false);
  const [showEndPicker,    setShowEndPicker]    = useState(false);

  // ── offer state ──
  const [company,     setCompany]     = useState("");
  const [role,        setRole]        = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [location,    setLocation]    = useState("");
  const [offerType,   setOfferType]   = useState<OfferType>("full_time");

  // ── validation ──
  const canPost =
    caption.trim().length > 0 &&
    (postType !== "project" || title.trim().length > 0) &&
    (postType !== "offer"   || (company.trim().length > 0 && role.trim().length > 0));

  // ── reset ──
  function resetForm() {
    setCaption("");
    setTitle("");
    setDescription("");
    setImageUri(null);
    setCurrentlyWorking(true);
    setStartedAt(new Date());
    setEndedAt(null);
    setError(null);
    setPostType("project");
    setCompany("");
    setRole("");
    setSalaryRange("");
    setLocation("");
    setOfferType("full_time");
  }

  // ── image ──
  async function pickImage() {
    const { status, canAskAgain } = await ImagePickerLib.getMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      if (!canAskAgain) return;
      const { status: newStatus } = await ImagePickerLib.requestMediaLibraryPermissionsAsync();
      if (newStatus !== "granted") return;
    }
    const result = await ImagePickerLib.launchImageLibraryAsync({
      mediaTypes: "images",
      quality:    0.85,
      allowsEditing: true,
      aspect:     [16, 9],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadImage(uri: string): Promise<string> {
    const fileName = `${Date.now()}.jpg`;
    const base64: string = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.responseType = "blob";
      xhr.open("GET", uri);
      xhr.send();
    });

    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, bytes, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
    return data.publicUrl;
  }

  // ── submit ──
  async function handlePost() {
    if (!canPost || posting) return;
    Keyboard.dismiss();
    setError(null);

    try {
      setPosting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // 1. Base post row
      const { data: createdPost, error: postError } = await supabase
        .from("posts")
        .insert({ user_id: user.id, post_type: postType, caption: caption.trim() || null })
        .select("id")
        .single();
      if (postError) throw postError;
      const postId = createdPost.id;

      // 2. Type-specific child row
      if (postType === "project") {
        const { error: projectError } = await supabase
          .from("project_posts")
          .insert({
            post_id:     postId,
            title:       title.trim(),
            description: description.trim() || null,
            started_at:  startedAt ? startedAt.toISOString().split("T")[0] : null,
            ended_at:    currentlyWorking || !endedAt ? null : endedAt.toISOString().split("T")[0],
            status:      currentlyWorking ? "active" : "completed",
          });
        if (projectError) throw projectError;
      }

      if (postType === "offer") {
        const { error: offerError } = await supabase
          .from("offer_posts")
          .insert({
            post_id:      postId,
            company:      company.trim()     || null,
            role:         role.trim()        || null,
            salary_range: salaryRange.trim() || null,
            location:     location.trim()    || null,
            offer_type:   offerType,
          });
        if (offerError) throw offerError;
      }

      // 3. Cover image
      if (imageUri) {
        const publicUrl = await uploadImage(imageUri);
        const { error: imageError } = await supabase
          .from("post_images")
          .insert({ post_id: postId, url: publicUrl, sort_order: 0 });
        if (imageError) throw imageError;
      }

      resetForm();
      bottomSheetRef.current?.dismiss();
      onPosted?.();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Try again.");
    } finally {
      setPosting(false);
    }
  }

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────

  const activeType = POST_TYPES.find((t) => t.value === postType)!;

  const fieldStyle = {
    backgroundColor:   colors.surface.secondary,
    borderRadius:      radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical:   14,
    color:             colors.text.primary,
    fontSize:          typography.body.size,
  } as const;

  return (
    <>
      {/* ── TRIGGER BAR ── */}
      <TouchableOpacity
  activeOpacity={0.75}
  onPress={() => bottomSheetRef.current?.present()}
  style={{
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.primary,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.sm,
    marginBottom: spacing.md,
  }}
>
  {/* Avatar */}
  <View
    style={{
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface.skillhive,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    }}
  >
    <Text style={{ color: colors.text.black, fontWeight: "800", fontSize: 13 }}>
      {initials}
    </Text>
  </View>

  {/* Label — not a field, just text */}
  <Text
    style={{
      flex: 1,
      color: colors.text.tertiary,
      fontSize: typography.body.size,
      marginHorizontal: 10
    }}
  >
    Share your progress...
  </Text>

  {/* Post type icons hint */}
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <Briefcase size={15} color={colors.text.tertiary} strokeWidth={1.6} />
    <Camera size={15} color={colors.text.tertiary} strokeWidth={1.6} />
    <FileText size={15} color={colors.text.tertiary} strokeWidth={1.6} />
  </View>

  {/* Plus button */}
  <View
    style={{
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bg.accentDim,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
      borderWidth: 1,
      borderColor: colors.surface.skillhive
    }}
  >
    <Plus size={18} color={colors.text.skillhive} strokeWidth={2.5} />
  </View>
</TouchableOpacity> 
      {/* ── BOTTOM SHEET ── */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        backgroundStyle={{ backgroundColor: colors.surface.primary }}
        handleIndicatorStyle={{ backgroundColor: colors.border.subtle, width: 36 }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.base,
            paddingTop:        spacing.sm,
            paddingBottom:     120,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection:  "row",
              justifyContent: "space-between",
              alignItems:     "center",
              marginBottom:   spacing.lg,
            }}
          >
            <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: "700", letterSpacing: -0.4 }}>
              New Post
            </Text>
            <Pressable
              onPress={() => { resetForm(); bottomSheetRef.current?.dismiss(); }}
              hitSlop={8}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.surface.secondary,
                justifyContent: "center", alignItems: "center",
              }}
            >
              <X size={15} color={colors.text.tertiary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Post type selector */}
          <View
            style={{
              flexDirection:   "row",
              gap:             spacing.xs,
              marginBottom:    spacing.lg,
              backgroundColor: colors.surface.secondary,
              borderRadius:    radii.xl,
              padding:         4,
            }}
          >
            {POST_TYPES.map((t) => {
              const active = t.value === postType;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setPostType(t.value)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: radii.lg,
                    alignItems: "center", gap: 4,
                    backgroundColor: active ? colors.surface.primary : "transparent",
                    ...(active && {
                      shadowColor: "#000", shadowOpacity: 0.08,
                      shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
                    }),
                  }}
                >
                  <t.Icon
                    size={18}
                    color={active ? colors.tint.primary : colors.text.tertiary}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <Text style={{ color: active ? colors.text.primary : colors.text.tertiary, fontSize: 11, fontWeight: active ? "700" : "500" }}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Type hint */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md }}>
            <activeType.Icon size={13} color={colors.text.tertiary} strokeWidth={1.8} />
            <Text style={{ color: colors.text.tertiary, fontSize: typography.bodySm.size }}>
              {activeType.hint}
            </Text>
          </View>

          {/* Caption */}
          <TextInput
            ref={captionRef}
            value={caption}
            onChangeText={setCaption}
            placeholder={
              postType === "project" ? "What are you building? Share an update..."
              : postType === "media"  ? "What's the story behind this?"
              :                         "Tell us about this opportunity..."
            }
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={500}
            blurOnSubmit={false}
            style={{
              ...fieldStyle,
              minHeight: 100, textAlignVertical: "top",
              lineHeight: typography.body.lineHeight, marginBottom: 4,
            }}
          />
          <Text
            style={{
              color: colors.text.tertiary, fontSize: 11,
              textAlign: "right", marginBottom: spacing.md,
              opacity: caption.length > 400 ? 1 : 0.5,
            }}
          >
            {caption.length}/500
          </Text>

          {/* ── PROJECT FIELDS ── */}
          {postType === "project" && (
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              <TextInput
                ref={titleRef}
                value={title}
                onChangeText={setTitle}
                placeholder="Project title *"
                placeholderTextColor={colors.text.tertiary}
                maxLength={80}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => descriptionRef.current?.focus()}
                style={{ ...fieldStyle, fontWeight: "600" }}
              />

              <TextInput
                ref={descriptionRef}
                value={description}
                onChangeText={setDescription}
                placeholder="Tech stack, what you built, key learnings..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                maxLength={300}
                blurOnSubmit
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={{ ...fieldStyle, minHeight: 80, textAlignVertical: "top", lineHeight: typography.body.lineHeight }}
              />

              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Pressable
                  onPress={() => { Keyboard.dismiss(); setShowStartPicker(true); }}
                  style={{ flex: 1, ...fieldStyle, gap: 4 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Calendar size={12} color={colors.text.tertiary} strokeWidth={1.8} />
                    <Text style={{ color: colors.text.tertiary, fontSize: 11 }}>Started</Text>
                  </View>
                  <Text style={{ color: colors.text.primary, fontSize: typography.bodySm.size, fontWeight: "600" }}>
                    {startedAt
                      ? startedAt.toLocaleDateString(undefined, { month: "short", year: "numeric" })
                      : "Pick date"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => { if (!currentlyWorking) { Keyboard.dismiss(); setShowEndPicker(true); } }}
                  style={{ flex: 1, ...fieldStyle, gap: 4, opacity: currentlyWorking ? 0.45 : 1 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Calendar size={12} color={colors.text.tertiary} strokeWidth={1.8} />
                    <Text style={{ color: colors.text.tertiary, fontSize: 11 }}>Ended</Text>
                  </View>
                  <Text style={{ color: colors.text.primary, fontSize: typography.bodySm.size, fontWeight: "600" }}>
                    {currentlyWorking ? "Present" : endedAt
                      ? endedAt.toLocaleDateString(undefined, { month: "short", year: "numeric" })
                      : "Pick date"}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => { setCurrentlyWorking((v) => !v); if (!currentlyWorking) setEndedAt(null); }}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs }}
              >
                <View
                  style={{
                    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
                    borderColor:     currentlyWorking ? colors.tint.primary : colors.border.subtle,
                    backgroundColor: currentlyWorking ? colors.tint.primary : "transparent",
                    justifyContent: "center", alignItems: "center",
                  }}
                >
                  {currentlyWorking && <Check size={11} color={colors.text.black} strokeWidth={3} />}
                </View>
                <Text style={{ color: colors.text.secondary, fontSize: typography.body.size }}>
                  I'm currently working on this
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── OFFER FIELDS ── */}
          {postType === "offer" && (
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>

              {/* Offer type pills */}
              <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
                {OFFER_TYPES.map((ot) => {
                  const active = ot.value === offerType;
                  return (
                    <Pressable
                      key={ot.value}
                      onPress={() => setOfferType(ot.value)}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical:   8,
                        borderRadius:      radii.pill,
                        borderWidth:       1.5,
                        borderColor:       active ? colors.tint.primary : colors.border.subtle,
                        backgroundColor:   active ? colors.tint.primary + "18" : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color:      active ? colors.tint.primary : colors.text.tertiary,
                          fontSize:   typography.bodySm.size,
                          fontWeight: active ? "700" : "500",
                        }}
                      >
                        {ot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Company */}
              <View style={{ position: "relative" }}>
                <View style={{ position: "absolute", left: spacing.md, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
                  <Building2 size={15} color={colors.text.tertiary} strokeWidth={1.8} />
                </View>
                <TextInput
                  ref={companyRef}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Company *"
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={80}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => roleRef.current?.focus()}
                  style={{ ...fieldStyle, paddingLeft: spacing.md + 22 }}
                />
              </View>

              {/* Role */}
              <View style={{ position: "relative" }}>
                <View style={{ position: "absolute", left: spacing.md, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
                  <Briefcase size={15} color={colors.text.tertiary} strokeWidth={1.8} />
                </View>
                <TextInput
                  ref={roleRef}
                  value={role}
                  onChangeText={setRole}
                  placeholder="Role / Position *"
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={80}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => salaryRef.current?.focus()}
                  style={{ ...fieldStyle, paddingLeft: spacing.md + 22 }}
                />
              </View>

              {/* Salary + Location side by side */}
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1, position: "relative" }}>
                  <View style={{ position: "absolute", left: spacing.sm, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
                    <DollarSign size={14} color={colors.text.tertiary} strokeWidth={1.8} />
                  </View>
                  <TextInput
                    ref={salaryRef}
                    value={salaryRange}
                    onChangeText={setSalaryRange}
                    placeholder="Salary range"
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={40}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => locationRef.current?.focus()}
                    style={{ ...fieldStyle, paddingLeft: spacing.sm + 20 }}
                  />
                </View>

                <View style={{ flex: 1, position: "relative" }}>
                  <View style={{ position: "absolute", left: spacing.sm, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
                    <MapPin size={14} color={colors.text.tertiary} strokeWidth={1.8} />
                  </View>
                  <TextInput
                    ref={locationRef}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Location"
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={60}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                    style={{ ...fieldStyle, paddingLeft: spacing.sm + 20 }}
                  />
                </View>
              </View>

            </View>
          )}

          {/* Cover image */}
          <Pressable
            onPress={pickImage}
            style={{
              backgroundColor: colors.surface.secondary,
              borderRadius:    radii.xl,
              overflow:        "hidden",
              minHeight:       imageUri ? 200 : 100,
              justifyContent:  "center",
              alignItems:      "center",
              marginBottom:    spacing.md,
              borderWidth:     imageUri ? 0 : 1,
              borderColor:     colors.border.subtle,
              borderStyle:     "dashed",
            }}
          >
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} resizeMode="cover" style={{ width: "100%", height: 200 }} />
                <Pressable
                  onPress={() => setImageUri(null)}
                  style={{
                    position: "absolute", top: spacing.sm, right: spacing.sm,
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    justifyContent: "center", alignItems: "center",
                  }}
                >
                  <X size={13} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </>
            ) : (
              <View style={{ alignItems: "center", gap: 6, paddingVertical: spacing.md }}>
                <View
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: colors.surface.primary,
                    justifyContent: "center", alignItems: "center",
                  }}
                >
                  <ImageIcon size={18} color={colors.text.tertiary} strokeWidth={1.6} />
                </View>
                <Text style={{ color: colors.text.tertiary, fontSize: typography.bodySm.size }}>
                  Add cover image
                </Text>
                <Text style={{ color: colors.text.tertiary, fontSize: 11, opacity: 0.55 }}>
                  Optional · 16:9
                </Text>
              </View>
            )}
          </Pressable>

          {/* Error */}
          {!!error && (
            <View
              style={{
                flexDirection: "row", alignItems: "flex-start", gap: spacing.sm,
                backgroundColor: "rgba(239,68,68,0.08)",
                borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md,
                borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
              }}
            >
              <AlertCircle size={15} color="#ef4444" strokeWidth={2} style={{ marginTop: 1 }} />
              <Text style={{ color: "#ef4444", fontSize: typography.bodySm.size, flex: 1 }}>
                {error}
              </Text>
            </View>
          )}

          {/* Publish button */}
          <Pressable
            onPress={handlePost}
            disabled={!canPost || posting}
            style={({ pressed }) => ({
              backgroundColor: canPost
                ? pressed ? colors.tint.primary + "cc" : colors.tint.primary
                : colors.surface.secondary,
              borderRadius: radii.pill, paddingVertical: 16,
              justifyContent: "center", alignItems: "center",
              flexDirection: "row", gap: 8,
            })}
          >
            {posting ? (
              <ActivityIndicator color={colors.text.black} />
            ) : (
              <>
                <Text style={{ color: canPost ? colors.text.black : colors.text.tertiary, fontWeight: "700", fontSize: typography.body.size, letterSpacing: 0.2 }}>
                  Publish
                </Text>
                {canPost && <ChevronRight size={16} color={colors.text.black} strokeWidth={2.5} />}
              </>
            )}
          </Pressable>

          {/* Validation hints */}
          {postType === "project" && !title.trim() && caption.trim().length > 0 && (
            <Text style={{ color: colors.text.tertiary, fontSize: 11, textAlign: "center", marginTop: spacing.sm, opacity: 0.7 }}>
              Project title is required to publish
            </Text>
          )}
          {postType === "offer" && caption.trim().length > 0 && (!company.trim() || !role.trim()) && (
            <Text style={{ color: colors.text.tertiary, fontSize: 11, textAlign: "center", marginTop: spacing.sm, opacity: 0.7 }}>
              Company and role are required to publish
            </Text>
          )}

        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Date pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startedAt ?? new Date()}
          mode="date"
          display="default"
          maximumDate={endedAt ?? new Date()}
          onChange={(_, selected) => { setShowStartPicker(false); if (selected) setStartedAt(selected); }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endedAt ?? new Date()}
          mode="date"
          display="default"
          minimumDate={startedAt ?? undefined}
          maximumDate={new Date()}
          onChange={(_, selected) => { setShowEndPicker(false); if (selected) setEndedAt(selected); }}
        />
      )}
    </>
  );
}