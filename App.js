import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const [recording, setRecording] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingSound, setPlayingSound] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [recordingName, setRecordingName] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else if (!isRecording && seconds !== 0) {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const loadRecordings = async () => {
    try {
      const savedRecordings = await AsyncStorage.getItem("recordings");
      if (savedRecordings) {
        setRecordings(JSON.parse(savedRecordings));
      }
    } catch (error) {
      console.error("Failed to load recordings", error);
    }
  };

  const saveRecordings = async (updatedRecordings) => {
    try {
      await AsyncStorage.setItem(
        "recordings",
        JSON.stringify(updatedRecordings)
      );
    } catch (error) {
      console.error("Failed to save recordings", error);
    }
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (granted) {
        const newRecording = new Audio.Recording();
        await newRecording.prepareToRecordAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );
        await newRecording.startAsync();
        setRecording(newRecording);
        setIsRecording(true);
        setSeconds(0);
      } else {
        alert("Permission to access microphone is required!");
      }
    } catch (error) {
      console.error("Failed to start recording", error);
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      clearInterval(seconds);
      const newRecording = {
        uri,
        date: new Date().toISOString(),
        duration: formatTime(seconds),
      };
      setRecordings([...recordings, { ...newRecording, name: "" }]);
      setSeconds(0);
      setIsModalVisible(true);
    } catch (error) {
      console.error("Failed to stop recording", error);
    }
  };

  const handleSaveRecording = () => {
    const updatedRecordings = recordings.map((rec, index) =>
      index === recordings.length - 1 ? { ...rec, name: recordingName } : rec
    );
    setRecordings(updatedRecordings);
    saveRecordings(updatedRecordings);
    setIsModalVisible(false);
  };

  const playRecording = async (uri) => {
    if (playingSound) {
      await playingSound.stopAsync();
      setPlayingSound(null);
    }
    const { sound } = await Audio.Sound.createAsync({ uri });
    setPlayingSound(sound);
    await sound.playAsync();
  };

  const deleteRecording = async (uri) => {
    const updatedRecordings = recordings.filter((record) => record.uri !== uri);
    setRecordings(updatedRecordings);
    await saveRecordings(updatedRecordings);
  };

  const filteredRecordings = recordings.filter(
    (note) =>
      note.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.date.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Expo Audio Recorder</Text>

      <TextInput
        style={styles.searchBar}
        placeholder="Search by name or date..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Text style={styles.timer}>{formatTime(seconds)}</Text>

      <FlatList
        data={filteredRecordings}
        keyExtractor={(item) => item.uri}
        renderItem={({ item }) => (
          <View style={styles.recordingItem}>
            <Text style={styles.recordingDate}>
              {item.name || "..."} - {item.duration}
            </Text>
            <View style={styles.buttons}>
              <Button title="Play" onPress={() => playRecording(item.uri)} />
              <Button
                title="Delete"
                color="red"
                // borderRadius="20"
                onPress={() => deleteRecording(item.uri)}
              />
            </View>
          </View>
        )}
      />

      <View style={styles.recordingControls}>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={recording ? stopRecording : startRecording}
        >
          <Text style={styles.recordButtonText}>
            {recording ? "Stop Recording" : "Start Recording"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name of Recording</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter name"
              value={recordingName}
              onChangeText={setRecordingName}
            />
            <Button title="Save" onPress={handleSaveRecording} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingTop: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#6200ee",
  },
  searchBar: {
    marginHorizontal: 20,
    padding: 10,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  timer: {
    textAlign: "center",
    fontSize: 75,
    fontWeight: 10,
    color: "#ddd",
    margin: 10,
  },
  recordingItem: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 10,
    margin: 10,
    gap: 10
  },
  recordingDate: {
    fontSize: 14,
    color: "#333",
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  recordingControls: {
    padding: 20,
    alignItems: "center",
  },
  recordButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 30,
  },
  recordButtonText: {
    color: "white",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  modalInput: {
    width: "100%",
    padding: 10,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
  },
});
