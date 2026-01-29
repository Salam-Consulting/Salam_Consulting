import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db, storage } from "@/lib/firebase";

type ResumeData = {
  id: string;
  name: string;
  size: number;
  url: string;
  mimeType: string;
  uploadedAt: Date;
  storagePath: string;
};

export default function ResumeScreen() {
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAllResumes, setShowAllResumes] = useState(false);

  // Load existing resumes on mount
  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setInitialLoading(false);
        return;
      }

      const resumesRef = collection(db, "users", user.uid, "resumes");
      const q = query(resumesRef, orderBy("uploadedAt", "desc"));
      const snapshot = await getDocs(q);

      const loadedResumes: ResumeData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedResumes.push({
          id: doc.id,
          name: data.name,
          size: data.size,
          url: data.url,
          mimeType: data.mimeType,
          uploadedAt: data.uploadedAt?.toDate() || new Date(),
          storagePath: data.storagePath,
        });
      });

      setResumes(loadedResumes);
    } catch (error) {
      console.error("Error loading resumes:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const pickAndUploadDocument = async () => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "You must be logged in to upload a resume.");
        setLoading(false);
        return;
      }

      // Check file size (10MB limit)
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert("Error", "File size must be less than 10MB.");
        setLoading(false);
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      // Create unique ID for this resume
      const resumeId = Date.now().toString();
      const fileExtension = file.name.split(".").pop() || "pdf";
      const storagePath = `resumes/${user.uid}/${resumeId}.${fileExtension}`;
      const storageRef = ref(storage, storagePath);

      // Fetch the file and convert to blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          Alert.alert("Error", "Failed to upload resume. Please try again.");
          setUploading(false);
          setLoading(false);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Save metadata to Firestore
          const resumeData = {
            name: file.name,
            size: file.size || 0,
            url: downloadURL,
            mimeType: file.mimeType || "application/pdf",
            uploadedAt: serverTimestamp(),
            storagePath: storagePath,
          };

          const resumeRef = doc(db, "users", user.uid, "resumes", resumeId);
          await setDoc(resumeRef, resumeData);

          // Add to local state
          const newResume: ResumeData = {
            id: resumeId,
            ...resumeData,
            uploadedAt: new Date(),
          };

          setResumes((prev) => [newResume, ...prev]);

          setUploading(false);
          setLoading(false);
          Alert.alert("Success", "Resume uploaded successfully!");
        }
      );
    } catch (error) {
      console.error("Error picking/uploading document:", error);
      Alert.alert("Error", "Failed to upload resume. Please try again.");
      setUploading(false);
      setLoading(false);
    }
  };

  const viewResume = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Alert.alert("Error", "Could not open resume.");
    }
  };

  const downloadResume = async (resume: ResumeData) => {
    try {
      // Use Share API to share/save the resume
      await Share.share({
        title: resume.name,
        message: `Download my resume: ${resume.name}`,
        url: resume.url,
      });
    } catch (error) {
      // User cancelled or error occurred
      if ((error as any)?.message !== "User did not share") {
        console.error("Error sharing resume:", error);
        // Fallback to opening in browser for download
        try {
          await Linking.openURL(resume.url);
        } catch {
          Alert.alert("Error", "Could not download resume.");
        }
      }
    }
  };

  const deleteResume = async (resume: ResumeData) => {
    Alert.alert(
      "Delete Resume",
      `Are you sure you want to delete "${resume.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const user = auth.currentUser;
              if (!user) return;

              // Try to delete from Storage (ignore if file doesn't exist)
              if (resume.storagePath) {
                try {
                  const storageRef = ref(storage, resume.storagePath);
                  await deleteObject(storageRef);
                } catch (storageError: any) {
                  // Ignore "object-not-found" errors - file may already be deleted
                  if (storageError?.code !== "storage/object-not-found") {
                    console.warn("Storage delete warning:", storageError);
                  }
                }
              }

              // Delete from Firestore
              const resumeRef = doc(db, "users", user.uid, "resumes", resume.id);
              await deleteDoc(resumeRef);

              // Remove from local state
              setResumes((prev) => prev.filter((r) => r.id !== resume.id));
              Alert.alert("Success", "Resume deleted.");
            } catch (error) {
              console.error("Error deleting resume:", error);
              Alert.alert("Error", "Failed to delete resume.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType === "application/pdf") {
      return "document-text";
    }
    return "document";
  };

  const latestResume = resumes[0];

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3fe1c3" />
          <Text style={styles.loadingText}>Loading resumes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Your Resume</Text>
          <Text style={styles.subtitle}>
            Upload your resume to apply for jobs faster
          </Text>
        </View>

        {/* Upload Area or Latest Resume */}
        {!latestResume ? (
          <Pressable
            style={({ pressed }) => [
              styles.uploadArea,
              pressed && !loading && styles.uploadAreaPressed,
            ]}
            onPress={pickAndUploadDocument}
            disabled={loading || uploading}
          >
            {uploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#3fe1c3" />
                <Text style={styles.uploadingText}>
                  Uploading... {Math.round(uploadProgress)}%
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${uploadProgress}%` },
                    ]}
                  />
                </View>
              </View>
            ) : loading ? (
              <ActivityIndicator size="large" color="#3fe1c3" />
            ) : (
              <>
                <View style={styles.uploadIconContainer}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={48}
                    color="#3fe1c3"
                  />
                </View>
                <Text style={styles.uploadTitle}>Tap to upload</Text>
                <Text style={styles.uploadSubtitle}>PDF or Word documents</Text>
                <Text style={styles.uploadHint}>Max file size: 10MB</Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.resumeCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Latest Resume</Text>
              {resumes.length > 1 && (
                <Pressable onPress={() => setShowAllResumes(true)}>
                  <Text style={styles.viewAllLink}>
                    View All ({resumes.length})
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.fileIconContainer}>
              <Ionicons
                name={getFileIcon(latestResume.mimeType) as any}
                size={40}
                color="#3fe1c3"
              />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={2}>
                {latestResume.name}
              </Text>
              <Text style={styles.fileSize}>
                {formatFileSize(latestResume.size)}
              </Text>
              <Text style={styles.uploadDate}>
                Uploaded {latestResume.uploadedAt.toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <Pressable
                style={styles.viewButton}
                onPress={() => viewResume(latestResume.url)}
                disabled={loading}
              >
                <Ionicons name="eye-outline" size={20} color="#3fe1c3" />
                <Text style={styles.viewButtonText}>View</Text>
              </Pressable>

              <Pressable
                style={styles.downloadButton}
                onPress={() => downloadResume(latestResume)}
                disabled={loading}
              >
                <Ionicons name="download-outline" size={20} color="#3fe1c3" />
                <Text style={styles.downloadButtonText}>Download</Text>
              </Pressable>

              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteResume(latestResume)}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
              </Pressable>
            </View>

            <Pressable
              style={styles.uploadNewButtonFull}
              onPress={pickAndUploadDocument}
              disabled={loading || uploading}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.uploadNewButtonText}>Upload New Resume</Text>
            </Pressable>

            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#3fe1c3" />
                <Text style={styles.uploadingSmallText}>
                  Uploading... {Math.round(uploadProgress)}%
                </Text>
              </View>
            )}
          </View>
        )}

        {/* View All Resumes Button */}
        {resumes.length >= 1 && (
          <Pressable
            style={styles.viewAllButton}
            onPress={() => setShowAllResumes(true)}
          >
            <Ionicons name="folder-open-outline" size={20} color="#3fe1c3" />
            <Text style={styles.viewAllButtonText}>
              View All Resumes ({resumes.length})
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#3fe1c3" />
          </Pressable>
        )}

        {/* Supported Formats */}
        <View style={styles.formatsSection}>
          <Text style={styles.formatsTitle}>Supported Formats</Text>
          <View style={styles.formatsList}>
            <View style={styles.formatItem}>
              <Ionicons name="document-text" size={20} color="#3fe1c3" />
              <Text style={styles.formatText}>PDF (.pdf)</Text>
            </View>
            <View style={styles.formatItem}>
              <Ionicons name="document" size={20} color="#3fe1c3" />
              <Text style={styles.formatText}>Word (.doc, .docx)</Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Resume Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#3fe1c3" />
            <Text style={styles.tipText}>Keep it to 1-2 pages</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#3fe1c3" />
            <Text style={styles.tipText}>Use clear, readable fonts</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#3fe1c3" />
            <Text style={styles.tipText}>Highlight relevant experience</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#3fe1c3" />
            <Text style={styles.tipText}>Proofread for errors</Text>
          </View>
        </View>
      </ScrollView>

      {/* All Resumes Modal */}
      <Modal
        visible={showAllResumes}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllResumes(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Resumes</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowAllResumes(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {resumes.map((resume) => (
              <View key={resume.id} style={styles.resumeListItem}>
                <View style={styles.listItemIcon}>
                  <Ionicons
                    name={getFileIcon(resume.mimeType) as any}
                    size={28}
                    color="#3fe1c3"
                  />
                </View>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName} numberOfLines={1}>
                    {resume.name}
                  </Text>
                  <Text style={styles.listItemMeta}>
                    {formatFileSize(resume.size)} •{" "}
                    {resume.uploadedAt.toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.listItemActions}>
                  <Pressable
                    style={styles.listActionButton}
                    onPress={() => viewResume(resume.url)}
                  >
                    <Ionicons name="eye-outline" size={20} color="#3fe1c3" />
                  </Pressable>
                  <Pressable
                    style={styles.listActionButton}
                    onPress={() => downloadResume(resume)}
                  >
                    <Ionicons name="download-outline" size={20} color="#3fe1c3" />
                  </Pressable>
                  <Pressable
                    style={styles.listDeleteButton}
                    onPress={() => deleteResume(resume)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                  </Pressable>
                </View>
              </View>
            ))}

            <Pressable
              style={styles.addMoreButton}
              onPress={() => {
                setShowAllResumes(false);
                pickAndUploadDocument();
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#3fe1c3" />
              <Text style={styles.addMoreText}>Upload Another Resume</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#08090d",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#a8b4b1",
    marginTop: 12,
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#a8b4b1",
  },
  uploadArea: {
    backgroundColor: "rgba(63, 225, 195, 0.08)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(63, 225, 195, 0.3)",
    borderStyle: "dashed",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  uploadAreaPressed: {
    backgroundColor: "rgba(63, 225, 195, 0.15)",
  },
  uploadIconContainer: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: "#a8b4b1",
    marginBottom: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: "#6f7d83",
  },
  uploadingContainer: {
    alignItems: "center",
  },
  uploadingText: {
    color: "#3fe1c3",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  progressBar: {
    width: "80%",
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3fe1c3",
    borderRadius: 3,
  },
  resumeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.3)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    color: "#6f7d83",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  viewAllLink: {
    fontSize: 14,
    color: "#3fe1c3",
    fontWeight: "600",
  },
  fileIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "rgba(63, 225, 195, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  fileInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  fileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
    textAlign: "center",
  },
  fileSize: {
    fontSize: 14,
    color: "#a8b4b1",
    marginBottom: 4,
  },
  uploadDate: {
    fontSize: 12,
    color: "#6f7d83",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(63, 225, 195, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.3)",
  },
  viewButtonText: {
    color: "#3fe1c3",
    fontWeight: "600",
    fontSize: 14,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(63, 225, 195, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.3)",
  },
  downloadButtonText: {
    color: "#3fe1c3",
    fontWeight: "600",
    fontSize: 14,
  },
  uploadNewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3fe1c3",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  uploadNewButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#3fe1c3",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  uploadNewButtonText: {
    color: "#08090d",
    fontWeight: "600",
    fontSize: 14,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  uploadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  uploadingSmallText: {
    color: "#3fe1c3",
    fontSize: 14,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(63, 225, 195, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.2)",
  },
  viewAllButtonText: {
    flex: 1,
    color: "#3fe1c3",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  formatsSection: {
    marginBottom: 24,
  },
  formatsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 12,
  },
  formatsList: {
    flexDirection: "row",
    gap: 16,
  },
  formatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  formatText: {
    fontSize: 14,
    color: "#d7e0de",
  },
  tipsSection: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: "#a8b4b1",
  },
  // Modal styles
  modalSafe: {
    flex: 1,
    backgroundColor: "#08090d",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resumeListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  listItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(63, 225, 195, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  listItemMeta: {
    fontSize: 13,
    color: "#6f7d83",
  },
  listItemActions: {
    flexDirection: "row",
    gap: 8,
  },
  listActionButton: {
    padding: 10,
    backgroundColor: "rgba(63, 225, 195, 0.15)",
    borderRadius: 8,
  },
  listDeleteButton: {
    padding: 10,
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    borderRadius: 8,
  },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(63, 225, 195, 0.08)",
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: "rgba(63, 225, 195, 0.2)",
    borderStyle: "dashed",
  },
  addMoreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3fe1c3",
  },
});
