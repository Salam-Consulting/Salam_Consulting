import { router, Stack } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/contexts/auth";
import {
  getAllTrackedJobs,
  getJobsByStatus,
  removeJobTracking,
  type JobApplicationStatus,
  type TrackedJob,
} from "@/lib/jobTracking";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";

type FilterType = "all" | JobApplicationStatus;

const FILTER_OPTIONS: Array<{ label: string; value: FilterType; icon: string }> = [
  { label: "All", value: "all", icon: "list.bullet" },
  { label: "Applied", value: "applied", icon: "checkmark.circle.fill" },
  { label: "Not Applied", value: "not_applied", icon: "xmark.circle.fill" },
];

function JobCard({ job, onRemove, onView }: { 
  job: TrackedJob; 
  onRemove: (id: string) => void;
  onView: (url: string) => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    Alert.alert(
      "Remove Job",
      `Are you sure you want to remove "${job.job_title}" from tracking?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setIsRemoving(true);
            try {
              await onRemove(job.job_id);
            } catch (error) {
              Alert.alert("Error", "Failed to remove job. Please try again.");
            } finally {
              setIsRemoving(false);
            }
          },
        },
      ]
    );
  };

  const locationParts = [
    job.job_city,
    job.job_state,
    job.job_country,
  ].filter(Boolean);

  const formatDate = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const statusColor = job.status === "applied" ? "#3fe1c3" : "#ff7b7b";
  const statusIcon = job.status === "applied" ? "check" : "cross";

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobCardHeader}>
        <View style={[styles.jobCardTitleSection, { alignItems: 'flex-start' }]}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, marginTop: 2 }]}>
            <Entypo name={statusIcon as any} size={14} color={statusColor} />
          </View>
          <View style={[styles.jobCardTitleContainer, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.jobCardTitle} numberOfLines={2}>
              {job.job_title}
            </Text>
            <Text style={styles.jobCardCompany}>{job.employer_name}</Text>
          </View>
        </View>
      </View>

      {locationParts.length > 0 && (
        <View style={styles.jobCardInfoRow}>
          <Entypo name="location-pin" size={14} color="#b0c7c0" />
          <Text style={styles.jobCardInfoText}>{locationParts.join(", ")}</Text>
        </View>
      )}

      {job.trackedAt && (
        <View style={styles.jobCardInfoRow}>
          <Entypo name="clock" size={14} color="#b0c7c0" />
          <Text style={styles.jobCardInfoText}>
            Tracked {formatDate(job.trackedAt)}
          </Text>
        </View>
      )}

      {job.appliedAt && job.status === "applied" && (
        <View style={styles.jobCardInfoRow}>
          <Entypo name="calendar" size={14} color="#3fe1c3" />
          <Text style={[styles.jobCardInfoText, { color: "#3fe1c3" }]}>
            Applied {formatDate(job.appliedAt)}
          </Text>
        </View>
      )}

      <View style={styles.jobCardActions}>
        {job.job_apply_link && (
          <Pressable
            style={styles.viewButton}
            onPress={() => onView(job.job_apply_link!)}
          >
            <Entypo name="link" size={16} color="#3fe1c3" />
            <Text style={styles.viewButtonText}>View</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
          onPress={handleRemove}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color="#ff7b7b" />
          ) : (
            <>
              <Entypo name="trash" size={16} color="#ff7b7b" />
              <Text style={styles.removeButtonText}>Remove</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({ filter }: { filter: FilterType }) {
  const messages = {
    all: {
      title: "No Tracked Jobs",
      message: "Start tracking jobs by marking them as Applied or Not Applied on the Jobs page.",
    },
    applied: {
      title: "No Applied Jobs",
      message: "You haven't marked any jobs as Applied yet. Start applying to track them here!",
    },
    not_applied: {
      title: "No Jobs Marked",
      message: "You haven't marked any jobs as Not Applied yet.",
    },
  };

  const current = messages[filter];

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Entypo name="inbox" size={56} color="#6f7d83" />
      </View>
      <Text style={styles.emptyStateTitle}>{current.title}</Text>
      <Text style={styles.emptyStateMessage}>{current.message}</Text>
    </View>
  );
}

export default function TrackScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let fetchedJobs: TrackedJob[];
      if (selectedFilter === "all") {
        fetchedJobs = await getAllTrackedJobs();
      } else {
        fetchedJobs = await getJobsByStatus(selectedFilter);
      }

      fetchedJobs.sort((a, b) => {
        const dateA = a.trackedAt?.getTime() || 0;
        const dateB = b.trackedAt?.getTime() || 0;
        return dateB - dateA;
      });

      setJobs(fetchedJobs);
    } catch (err) {
      setError("Failed to load jobs. Please try again.");
      console.error("Error fetching jobs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRemove = useCallback(async (jobId: string) => {
    try {
      await removeJobTracking(jobId);
      setJobs((prev) => prev.filter((job) => job.job_id !== jobId));
    } catch (err) {
      throw err;
    }
  }, []);

  const handleViewJob = useCallback(async (url: string) => {
    try {
      await openBrowserAsync(url, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    } catch (err) {
      Alert.alert("Error", "Failed to open job link. Please try again.");
    }
  }, []);

  const filterCounts = useMemo(() => {
    // This would ideally be calculated from all jobs, but for simplicity
    // we'll show the current filter's count
    return {
      all: jobs.length,
      applied: jobs.filter((j) => j.status === "applied").length,
      not_applied: jobs.filter((j) => j.status === "not_applied").length,
    };
  }, [jobs]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.authPrompt}>
          <IconSymbol name="lock.fill" size={48} color="#6f7d83" />
          <Text style={styles.authPromptTitle}>Sign In Required</Text>
          <Text style={styles.authPromptMessage}>
            Please sign in to track your job applications.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container]}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
              onPress={() => router.push("/(tabs)/jobs")}
            >
              <Ionicons name="chevron-back" size={28} color="white" />  
            </Pressable>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Tracked Jobs</Text>
              <Text style={styles.headerSubtitle}>
                Manage your job applications
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {FILTER_OPTIONS.map((option) => {
              const isActive = selectedFilter === option.value;
              const count = filterCounts[option.value] || 0;
              
              return (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.filterButton,
                    isActive && styles.filterButtonActive,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setSelectedFilter(option.value)}
                >
                  <IconSymbol
                    name={option.icon as any}
                    size={14}
                    color={isActive ? "#02111E" : "#738A9D"}
                  />
                  <Text
                    style={[
                      styles.filterButtonText,
                      isActive && styles.filterButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                      <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={20} color="#FF453A" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3fe1c3" />
            <Text style={styles.loadingText}>Loading your jobs...</Text>
          </View>
        ) : jobs.length === 0 ? (
          <EmptyState filter={selectedFilter} />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.job_id}
            renderItem={({ item }) => (
              <JobCard job={item} onRemove={handleRemove} onView={handleViewJob} />
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#02111E", // App Dark Theme
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#112638",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#738A9D",
    marginTop: 2,
    fontWeight: "500",
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#112638",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  filterButtonActive: {
    backgroundColor: "#3fe1c3",
    borderColor: "#3fe1c3",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#738A9D",
  },
  filterButtonTextActive: {
    color: "#02111E",
    fontWeight: "700",
  },
  filterBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  filterBadgeActive: {
    backgroundColor: "rgba(2, 17, 30, 0.2)",
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8FA8BB",
  },
  filterBadgeTextActive: {
    color: "#02111E",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "rgba(255, 69, 58, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 58, 0.2)",
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#FF453A",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#738A9D",
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  jobCard: {
    backgroundColor: "#112638",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  jobCardHeader: {
    marginBottom: 16,
  },
  jobCardTitleSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  jobCardTitleContainer: {
    flex: 1,
  },
  jobCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 6,
    lineHeight: 24,
  },
  jobCardCompany: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3fe1c3",
  },
  jobCardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  jobCardInfoText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8FA8BB",
  },
  jobCardActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#1C3C54",
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "rgba(255, 69, 58, 0.1)",
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF453A",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 24,
    opacity: 0.8,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 15,
    color: "#738A9D",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },
  authPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  authPromptTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginTop: 24,
    marginBottom: 12,
  },
  authPromptMessage: {
    fontSize: 16,
    color: "#738A9D",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },
});
