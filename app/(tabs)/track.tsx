import { router } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.push("/(tabs)/jobs")}
          >
            <Entypo name="chevron-left" size={24} color="#3fe1c3" />
          </Pressable>
          <IconSymbol name="list.bullet" size={32} color="#3fe1c3" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Tracked Jobs</Text>
            <Text style={styles.headerSubtitle}>
              Manage your job applications
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.filters}>
        {FILTER_OPTIONS.map((option) => {
          const isActive = selectedFilter === option.value;
          const count = filterCounts[option.value] || 0;
          
          return (
            <Pressable
              key={option.value}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => setSelectedFilter(option.value)}
            >
              <View style={styles.filterButtonContent}>
                <IconSymbol
                  name={option.icon as any}
                  size={14}
                  color={isActive ? "#08090d" : "#3fe1c3"}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    isActive && styles.filterButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </View>
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
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Entypo name="warning" size={20} color="#ff7b7b" />
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090d",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(63, 225, 195, 0.1)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#b0c7c0",
    marginTop: 2,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 6,
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(63, 225, 195, 0.3)",
    backgroundColor: "transparent",
    minWidth: 0,
  },
  filterButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
    flexShrink: 1,
  },
  filterButtonActive: {
    backgroundColor: "#3fe1c3",
    borderColor: "#3fe1c3",
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3fe1c3",
    flexShrink: 0,
  },
  filterButtonTextActive: {
    color: "#08090d",
  },
  filterBadge: {
    backgroundColor: "rgba(63, 225, 195, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: 2,
  },
  filterBadgeActive: {
    backgroundColor: "rgba(8, 9, 13, 0.3)",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3fe1c3",
    textAlign: "center",
  },
  filterBadgeTextActive: {
    color: "#08090d",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "rgba(255, 123, 123, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 123, 123, 0.3)",
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#ff7b7b",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#b0c7c0",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  jobCard: {
    backgroundColor: "#11141b",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.2)",
  },
  jobCardHeader: {
    marginBottom: 12,
  },
  jobCardTitleSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    marginBottom: 4,
  },
  jobCardCompany: {
    fontSize: 15,
    fontWeight: "600",
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
    color: "#b0c7c0",
  },
  jobCardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3fe1c3",
    backgroundColor: "transparent",
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3fe1c3",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ff7b7b",
    backgroundColor: "transparent",
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ff7b7b",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 15,
    color: "#b0c7c0",
    textAlign: "center",
    lineHeight: 22,
  },
  authPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  authPromptTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginTop: 20,
    marginBottom: 8,
  },
  authPromptMessage: {
    fontSize: 16,
    color: "#b0c7c0",
    textAlign: "center",
    lineHeight: 24,
  },
});

