import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as Print from "expo-print";
import { Stack } from "expo-router";
import * as Sharing from "expo-sharing";
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
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { auth, db, storage } from "@/lib/firebase";
import {
  generateFormattedResume,
  parseResumeText,
  saveResumeAsDocx,
  type ParsedResume,
} from "@/lib/resumeFormatter";

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
  const insets = useSafeAreaInsets();
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAllResumes, setShowAllResumes] = useState(false);
  const [showFormattedResume, setShowFormattedResume] = useState(false);
  const [formattedText, setFormattedText] = useState("");
  const [formatting, setFormatting] = useState(false);

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

  const formatResume = async (resume: ResumeData) => {
    try {
      setFormatting(true);
      const formatted = await generateFormattedResume(resume.url, resume.mimeType);
      setFormattedText(formatted);
      setShowFormattedResume(true);
    } catch (error) {
      console.error("Error formatting resume:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to extract text. Make sure the document contains readable text (not scanned images).";
      Alert.alert("Error", message);
    } finally {
      setFormatting(false);
    }
  };

  const copyFormattedText = async () => {
    try {
      await Clipboard.setStringAsync(formattedText);
      Alert.alert("Success", "Formatted resume copied to clipboard!");
    } catch (error) {
      Alert.alert("Error", "Failed to copy to clipboard.");
    }
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
  const parsedResume: ParsedResume | null = formattedText
    ? parseResumeText(formattedText)
    : null;

  const saveResumeAsPdf = async (resume: ParsedResume) => {
    const escapeHtml = (text: string): string =>
      text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 8px; font-size: 26px; }
            .contact { margin: 0 0 16px; font-size: 12px; color: #444; }
            .section { margin-top: 18px; }
            .section h2 { font-size: 13px; margin: 0 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            pre { white-space: pre-wrap; font-family: "Courier New", monospace; font-size: 11px; line-height: 1.45; margin: 0; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(resume.name || "Resume")}</h1>
          <p class="contact">${escapeHtml(
            [
              resume.location,
              resume.phone,
              resume.email,
              resume.linkedin,
              resume.github,
              resume.portfolio,
            ]
              .filter(Boolean)
              .join(" | ")
          )}</p>
          <div class="section">
            <h2>Formatted Content</h2>
            <pre>${escapeHtml(formattedText)}</pre>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is not available on this device.");
    }

    await Sharing.shareAsync(uri, {
      UTI: "com.adobe.pdf",
      mimeType: "application/pdf",
      dialogTitle: "Save Resume as PDF",
    });
  };

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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView
        // We move the styles.safe styles directly to the ScrollView
        style={{ flex: 1, backgroundColor: "#02111E" }} 
        contentContainerStyle={[
          styles.scrollContent,
          // Handle both top and bottom safe padding inside the ScrollView
          { paddingTop: insets.top, paddingBottom: insets.bottom + 40 } 
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={22} color="#3fe1c3" />
              </View>
              <Text style={styles.title}>Your Resume</Text>
            </View>
          </View>
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
                    size={36}
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
                <Pressable
                  style={({ pressed }) => [pressed && styles.viewAllLinkPressed]}
                  onPress={() => setShowAllResumes(true)}
                >
                  <Text style={styles.viewAllLink}>
                    View All ({resumes.length})
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.fileIconContainer}>
              <Ionicons
                name={getFileIcon(latestResume.mimeType) as any}
                size={32}
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
                style={({ pressed }) => [
                  styles.viewButton,
                  pressed && !loading && styles.actionButtonPressed,
                ]}
                onPress={() => viewResume(latestResume.url)}
                disabled={loading}
              >
                <Ionicons name="eye-outline" size={20} color="white" />
                <Text style={styles.viewButtonText}>View</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.downloadButton,
                  pressed && !loading && styles.actionButtonPressed,
                ]}
                onPress={() => downloadResume(latestResume)}
                disabled={loading}
              >
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.downloadButtonText}>Download</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && !loading && styles.actionButtonPressed,
                ]}
                onPress={() => deleteResume(latestResume)}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={20} color="#FF453A" />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.formatButton,
                pressed && !formatting && styles.formatButtonPressed,
              ]}
              onPress={() => formatResume(latestResume)}
              disabled={loading || formatting}
            >
              {formatting ? (
                <>
                  <ActivityIndicator size="small" color="#3fe1c3" />
                  <Text style={styles.formatButtonText}>Formatting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#3fe1c3" />
                  <Text style={styles.formatButtonText}>Format to Template</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.uploadNewButtonFull,
                pressed && !loading && !uploading && styles.uploadNewButtonPressed,
              ]}
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
            style={({ pressed }) => [
              styles.viewAllButton,
              pressed && styles.viewAllButtonPressed,
            ]}
            onPress={() => setShowAllResumes(true)}
          >
            <Ionicons name="folder-open-outline" size={20} color="#3fe1c3" />
            <Text style={styles.viewAllButtonText}>
              View All Resumes ({resumes.length})
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#738A9D" />
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
              <Text style={styles.formatText}>Word (.docx)</Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Resume Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#3fe1c3" />
            <Text style={styles.tipText}>Keep it to 1 page</Text>
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
                    <Ionicons name="trash-outline" size={20} color="#FF453A" />
                  </Pressable>
                </View>
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.addMoreButton,
                pressed && styles.addMoreButtonPressed,
              ]}
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

      {/* Formatted Resume Modal */}
      <Modal
        visible={showFormattedResume}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFormattedResume(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Formatted Resume</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowFormattedResume(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.saveWordHeaderButton,
                pressed && styles.saveWordHeaderButtonPressed,
              ]}
              onPress={async () => {
                try {
                  if (!parsedResume) throw new Error("No resume data to export");
                  await saveResumeAsDocx(parsedResume);
                } catch (error) {
                  console.error("Error saving Word document:", error);
                  Alert.alert(
                    "Export Failed",
                    error instanceof Error ? error.message : "Could not save document."
                  );
                }
              }}
            >
              <Ionicons name="document-text-outline" size={18} color="#3fe1c3" />
              <Text style={styles.saveWordHeaderButtonText}>Save as Word</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.resumeSheet}>

              {/* Name */}
              {parsedResume?.name ? (
                <Text style={styles.resumeName}>{parsedResume.name}</Text>
              ) : null}

              {/* Contact line */}
              {parsedResume && (
                <Text style={styles.resumeContact}>
                  {[
                    parsedResume.location,
                    parsedResume.phone,
                    parsedResume.email,
                    parsedResume.linkedin,
                    parsedResume.github,
                    parsedResume.portfolio,
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
              )}

              <View style={styles.resumeDivider} />

              {/* Education */}
              {parsedResume?.education && parsedResume.education.length > 0 && (
                <View style={styles.resumeSection}>
                  <Text style={styles.resumeSectionHeader}>EDUCATION</Text>
                  <View style={styles.resumeSectionUnderline} />
                  {parsedResume.education.map((edu, idx) => (
                    <View key={idx} style={styles.resumeEntryBlock}>
                      <View style={styles.resumeRow}>
                        <Text style={styles.resumeBold}>
                          {edu.degree}
                          {edu.institution ? (
                            <Text style={styles.resumeItalicInline}>{`, ${edu.institution}`}</Text>
                          ) : null}
                        </Text>
                        <Text style={styles.resumeDate}>{edu.date}</Text>
                      </View>
                      {edu.gpa ? (
                        <Text style={styles.resumeSubText}>{edu.gpa}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Technical Skills */}
              {parsedResume?.skills ? (
                <View style={styles.resumeSection}>
                  <Text style={styles.resumeSectionHeader}>TECHNICAL SKILLS</Text>
                  <View style={styles.resumeSectionUnderline} />
                  <Text style={styles.resumeBodyText}>{parsedResume.skills}</Text>
                </View>
              ) : null}

              {/* Professional Experience */}
              {parsedResume?.experience && parsedResume.experience.length > 0 && (
                <View style={styles.resumeSection}>
                  <Text style={styles.resumeSectionHeader}>PROFESSIONAL EXPERIENCE</Text>
                  <View style={styles.resumeSectionUnderline} />
                  {parsedResume.experience.map((exp, idx) => (
                    <View key={idx} style={styles.resumeEntryBlock}>
                      <View style={styles.resumeRow}>
                        <Text style={styles.resumeBold}>{exp.company}</Text>
                        <Text style={styles.resumeDate}>{exp.date}</Text>
                      </View>
                      {(exp.position || exp.location) && (
                        <View style={styles.resumeRow}>
                          <Text style={styles.resumeItalic}>{exp.position}</Text>
                          <Text style={styles.resumeItalic}>{exp.location}</Text>
                        </View>
                      )}
                      {exp.bullets.map((bullet, bIdx) => (
                        <View key={bIdx} style={styles.resumeBulletRow}>
                          <Text style={styles.resumeBulletDot}>•</Text>
                          <Text style={styles.resumeBulletText}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {/* Technical Projects */}
              {parsedResume?.projects && parsedResume.projects.length > 0 && (
                <View style={styles.resumeSection}>
                  <Text style={styles.resumeSectionHeader}>TECHNICAL PROJECTS</Text>
                  <View style={styles.resumeSectionUnderline} />
                  {parsedResume.projects.map((proj, idx) => (
                    <View key={idx} style={styles.resumeEntryBlock}>
                      <Text style={styles.resumeBold}>
                        {proj.name}
                        {proj.technologies ? (
                          <Text style={styles.resumeItalicInline}>
                            {" "}({proj.technologies})
                          </Text>
                        ) : null}
                      </Text>
                      {proj.bullets.map((bullet, bIdx) => (
                        <View key={bIdx} style={styles.resumeBulletRow}>
                          <Text style={styles.resumeBulletDot}>•</Text>
                          <Text style={styles.resumeBulletText}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}

            </View>

            <View style={styles.formattedActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.savePdfButton,
                  pressed && styles.savePdfButtonPressed,
                ]}
                onPress={async () => {
                  try {
                    if (!parsedResume) throw new Error("No resume data to export");
                    await saveResumeAsDocx(parsedResume);
                  } catch (error) {
                    console.error("Error saving Word document:", error);
                    Alert.alert(
                      "Export Failed",
                      error instanceof Error ? error.message : "Could not save document."
                    );
                  }
                }}
              >
                <Ionicons name="document-text-outline" size={20} color="white" />
                <Text style={styles.savePdfButtonText}>Save as Word</Text>
              </Pressable>
            </View>

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#02111E",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#738A9D",
    marginTop: 12,
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    gap: 12,
    marginTop: -20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#112638",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#738A9D",
    lineHeight: 22,
  },
  uploadArea: {
    backgroundColor: "#112638",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#1C3C54",
    borderStyle: "dashed",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadAreaPressed: {
    backgroundColor: "#133E59",
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1C3C54",
    alignItems: "center",
    justifyContent: "center",
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
    color: "#738A9D",
    marginBottom: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: "#8FA8BB",
  },
  uploadingContainer: {
    alignItems: "center",
    width: "100%",
  },
  uploadingText: {
    color: "#3fe1c3",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#1C3C54",
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
    backgroundColor: "#112638",
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 14,
    color: "#8FA8BB",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  viewAllLink: {
    fontSize: 14,
    color: "#3fe1c3",
    fontWeight: "600",
  },
  viewAllLinkPressed: {
    opacity: 0.7,
  },
  fileIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#1C3C54",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  fileInfo: {
    alignItems: "center",
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
    color: "#738A9D",
    marginBottom: 4,
  },
  uploadDate: {
    fontSize: 12,
    color: "#8FA8BB",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#254D6B",
    paddingVertical: 12,
    borderRadius: 14,
  },
  viewButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  downloadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#254D6B",
    paddingVertical: 12,
    borderRadius: 14,
  },
  downloadButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#254D6B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  actionButtonPressed: {
    backgroundColor: "#1C3C54",
  },
  formatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#254D6B", 
    paddingVertical: 14,
    borderRadius: 14,
  },
  formatButtonPressed: {
    backgroundColor: "#1C3C54",
  },
  formatButtonText: {
    color: "#3fe1c3",
    fontWeight: "600",
    fontSize: 15,
  },
  uploadNewButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#254D6B",
    paddingVertical: 14,
    borderRadius: 14,
  },
  uploadNewButtonPressed: {
    backgroundColor: "#1C3C54",
  },
  uploadNewButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  uploadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1C3C54",
  },
  uploadingSmallText: {
    color: "#3fe1c3",
    fontSize: 14,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#254D6B",
    borderRadius: 24,
    padding: 20,
  },
  viewAllButtonPressed: {
    backgroundColor: "#1C3C54",
  },
  viewAllButtonText: {
    flex: 1,
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  formatsSection: {
    backgroundColor: "#112638",
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  formatsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  formatsList: {
    flexDirection: "row",
    gap: 12,
  },
  formatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1C3C54",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  formatText: {
    fontSize: 14,
    color: "white",
  },
  tipsSection: {
    backgroundColor: "#112638",
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tipText: {
    fontSize: 14,
    color: "#8FA8BB",
  },
  modalSafe: {
    flex: 1,
    backgroundColor: "#02111E",
  },
  modalHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#112638",
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  saveWordHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#254D6B",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  saveWordHeaderButtonPressed: {
    backgroundColor: "#1C3C54",
  },
  saveWordHeaderButtonText: {
    color: "#3fe1c3",
    fontWeight: "600",
    fontSize: 13,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  resumeListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#112638",
    borderRadius: 20,
    padding: 16,
  },
  listItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#1C3C54",
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
    color: "#738A9D",
  },
  listItemActions: {
    flexDirection: "row",
    gap: 8,
  },
  listActionButton: {
    padding: 10,
    backgroundColor: "#1C3C54",
    borderRadius: 12,
  },
  listDeleteButton: {
    padding: 10,
    backgroundColor: "rgba(255, 69, 58, 0.1)",
    borderRadius: 12,
  },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#112638",
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
  },
  addMoreButtonPressed: {
    backgroundColor: "#0F2838",
  },
  addMoreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3fe1c3",
  },
  formattedActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  savePdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#254D6B",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  savePdfButtonPressed: {
    backgroundColor: "#1C3C54",
  },
  savePdfButtonText: {
    color: "#3fe1c3",
    fontWeight: "600",
    fontSize: 15,
  },
  resumeSheet: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 20,
  },
  resumeName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  resumeContact: {
    marginTop: 8,
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
    lineHeight: 16,
  },
  resumeDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginTop: 10,
    marginBottom: 12,
  },
  resumeSection: {
    marginTop: 8,
  },
  resumeSectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.6,
  },
  resumeSectionUnderline: {
    height: 1,
    backgroundColor: "#111827",
    marginTop: 4,
    marginBottom: 8,
  },
  resumeEntryBlock: {
    marginBottom: 8,
  },
  resumeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  resumeBold: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  resumeDate: {
    fontSize: 11,
    color: "#111827",
  },
  resumeSubText: {
    marginTop: 3,
    fontSize: 11,
    color: "#374151",
  },
  resumeBodyText: {
    fontSize: 11,
    color: "#111827",
    lineHeight: 17,
  },
  resumeItalic: {
    flex: 1,
    fontSize: 11,
    fontStyle: "italic",
    color: "#374151",
  },
  resumeItalicInline: {
    fontSize: 12,
    fontWeight: "400",
    fontStyle: "italic",
    color: "#374151",
  },
  resumeBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 3,
  },
  resumeBulletDot: {
    fontSize: 11,
    color: "#111827",
    marginRight: 6,
    lineHeight: 17,
  },
  resumeBulletText: {
    flex: 1,
    fontSize: 11,
    color: "#111827",
    lineHeight: 17,
  },
  copyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3fe1c3",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  copyButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(63, 225, 195, 0.15)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.3)",
  },
  shareButtonText: {
    color: "#3fe1c3",
    fontWeight: "600",
    fontSize: 15,
  },
  formattedHint: {
    color: "#6f7d83",
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
});
