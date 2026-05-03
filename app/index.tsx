import { Image, StyleSheet, Text, View } from "react-native";

const Index = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to SkillHive</Text>
      <Image
        style={styles.img}
        source={require("../assets/images/skillhive.png")}
        alt=""
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#25292e",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
  },
  button: {
    fontSize: 20,
    textDecorationLine: "underline",
    color: "#fff",
  },
  img: {
    width: 100,
    height: 100,
  },
});

export default Index;
