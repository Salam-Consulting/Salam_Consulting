import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useAuth } from "@/contexts/auth";
import {
    getJobsByStatus,
    removeJobTracking,
    type TrackedJob,
} from "@/lib/jobTracking";
import Entypo from "@expo/vector-icons/Entypo";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";

const handleOpenURL = async (url: string) => {
  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  } catch (error) {
    console.error("Error opening URL:", error);
  }
};

const formatLocation = (job: TrackedJob): string => {
  const parts = [];
  if (job.job_city) parts.push(job.job_city);
  if (job.job_state) parts.push(job.job_state);
  if (job.job_country) parts.push(job.job_country);
  return parts.length > 0 ? parts.join(", ") : "Location not specified";
};

const formatDatePosted = (dateString?: string): string => {
  if (!dateString) return "Date not available";
  
  try {
    const postedDate = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - postedDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return "Just posted";
    } else if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours === 0) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return diffInMinutes <= 1 ? "Just now" : `${diffInMinutes} minutes ago`;
      }
      return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
    } else if (diffInDays === 1) {
      return "1 day ago";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
    } else {
      return postedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: postedDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date not available";
  }
};

const formatAppliedDate = (date?: Date): string => {
  if (!date) return "Date not available";
  
  try {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return "Applied today";
    } else if (diffInDays === 1) {
      return "Applied yesterday";
    } else if (diffInDays < 7) {
      return `Applied ${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `Applied ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    } else {
      return `Applied on ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })}`;
    }
  } catch (error) {
    console.error("Error formatting applied date:", error);
    return "Date not available";
  }
};

export default function Applied() {
  const { isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingJobId, setRemovingJobId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadAppliedJobs();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadAppliedJobs = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const fetchedJobs = await getJobsByStatus("applied");
      
      // Sort by applied date (most recent first)
      fetchedJobs.sort((a, b) => {
        const dateA = a.appliedAt?.getTime() || a.trackedAt?.getTime() || 0;
        const dateB = b.appliedAt?.getTime() || b.trackedAt?.getTime() || 0;
        return dateB - dateA;
      });
      
      setJobs(fetchedJobs);
    } catch (error) {
      console.error("Error loading applied jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (jobId: string) => {
    setRemovingJobId(jobId);
    try {
      await removeJobTracking(jobId);
      setJobs((prev) => prev.filter((job) => job.job_id !== jobId));
    } catch (error) {
      console.error("Error removing job:", error);
    } finally {
      setRemovingJobId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Applied Jobs</Text>
          <Text style={styles.subtitle}>Please sign in to view your applied jobs.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace("/")}>
            <Text style={styles.primaryButtonLabel}>Go to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => router.back()}
            >
              <Entypo name="chevron-left" size={24} color="#3fe1c3" />
            </Pressable>
            <Entypo name="check" size={28} color="#3fe1c3" />
            <Text style={styles.title}>Applied Jobs</Text>
          </View>
          <Text style={styles.subtitle}>
            Track all the jobs you've applied to.
          </Text>
          {jobs.length > 0 && (
            <Text style={styles.countText}>
              {jobs.length} {jobs.length === 1 ? "application" : "applications"}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3fe1c3" />
            <Text style={styles.loadingText}>Loading applied jobs...</Text>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Entypo name="inbox" size={48} color="#6f7d83" />
            <Text style={styles.emptyTitle}>No Applied Jobs Yet</Text>
            <Text style={styles.emptyText}>
              Start applying to jobs and mark them as "Applied" to track them here.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => router.push("/(tabs)/jobs")}
            >
              <Text style={styles.primaryButtonLabel}>Browse Jobs</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.jobsSection}>
            {jobs.map((job) => (
              <View key={job.job_id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={styles.jobTitleRow}>
                    <Entypo name="briefcase" size={20} color="#3fe1c3" />
                    <Text style={styles.jobTitle}>{job.job_title}</Text>
                  </View>
                  <Text style={styles.employerName}>{job.employer_name}</Text>
                </View>

                <View style={styles.jobDetails}>
                  <View style={styles.jobDetailRow}>
                    <Entypo name="location" size={16} color="#b0c7c0" />
                    <Text style={styles.jobDetailText}>{formatLocation(job)}</Text>
                  </View>
                  {job.job_posted_at_datetime_utc && (
                    <View style={styles.jobDetailRow}>
                      <Entypo name="calendar" size={16} color="#b0c7c0" />
                      <Text style={styles.jobDetailText}>
                        Posted: {formatDatePosted(job.job_posted_at_datetime_utc)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.jobDetailRow}>
                    <Entypo name="check" size={16} color="#3fe1c3" />
                    <Text style={styles.appliedDateText}>
                      {formatAppliedDate(job.appliedAt)}
                    </Text>
                  </View>
                </View>

                {job.job_description && (
                  <Text style={styles.jobDescription} numberOfLines={3}>
                    {job.job_description}
                  </Text>
                )}

                <View style={styles.jobActions}>
                  {job.job_apply_link && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.viewButton,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => handleOpenURL(job.job_apply_link!)}
                    >
                      <Entypo name="link" size={16} color="#3fe1c3" />
                      <Text style={styles.viewButtonText}>View Job</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={({ pressed }) => [
                      styles.removeButton,
                      removingJobId === job.job_id && styles.removeButtonDisabled,
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() => handleRemove(job.job_id)}
                    disabled={removingJobId === job.job_id}
                  >
                    {removingJobId === job.job_id ? (
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
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090d",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#b0c7c0",
    lineHeight: 22,
  },
  countText: {
    fontSize: 14,
    color: "#3fe1c3",
    fontWeight: "600",
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: "#b0c7c0",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    color: "white",
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    color: "#b0c7c0",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  jobsSection: {
    gap: 16,
  },
  jobCard: {
    backgroundColor: "#11141b",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.3)",
    gap: 12,
  },
  jobHeader: {
    gap: 8,
  },
  jobTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  jobTitle: {
    fontSize: 18,
    color: "white",
    fontWeight: "700",
    flex: 1,
  },
  employerName: {
    fontSize: 15,
    color: "#3fe1c3",
    fontWeight: "600",
  },
  jobDetails: {
    gap: 8,
    marginTop: 4,
  },
  jobDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  jobDetailText: {
    fontSize: 14,
    color: "#b0c7c0",
  },
  appliedDateText: {
    fontSize: 14,
    color: "#3fe1c3",
    fontWeight: "600",
  },
  jobDescription: {
    fontSize: 14,
    color: "#d7e0de",
    lineHeight: 20,
    marginTop: 8,
  },
  jobActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3fe1c3",
    backgroundColor: "transparent",
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3fe1c3",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
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
  primaryButton: {
    backgroundColor: "#3fe1c3",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#08090d",
  },
});

