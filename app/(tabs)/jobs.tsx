import Constants from "expo-constants";
import { router } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/contexts/auth";
import { getJobStatuses, saveJobStatus, type JobApplicationStatus } from "@/lib/jobTracking";
import Entypo from "@expo/vector-icons/Entypo";

// Job type definition
export type Job = {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_description?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
};

const POPULAR_JOB_BOARDS = [
  {
    name: "LinkedIn Jobs",
    url: "https://www.linkedin.com/jobs/",
    icon: "linkedin",
  },
  {
    name: "Indeed",
    url: "https://www.indeed.com/",
    icon: "briefcase",
  },
  {
    name: "Glassdoor",
    url: "https://www.glassdoor.com/Job/index.htm",
    icon: "briefcase",
  },
  {
    name: "Monster",
    url: "https://www.monster.com/",
    icon: "briefcase",
  },
  {
    name: "ZipRecruiter",
    url: "https://www.ziprecruiter.com/",
    icon: "briefcase",
  },
];

const handleOpenURL = async (url: string) => {
  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  } catch (error) {
    console.error("Error opening URL:", error);
  }
};

// JSearch API configuration
const JSEARCH_API_KEY = 
  Constants.expoConfig?.extra?.jsearchApiKey || 
  process.env.JSEARCH_API_KEY || 
  "";
const JSEARCH_API_HOST = "jsearch.p.rapidapi.com";

const fetchJobs = async (query: string, location?: string): Promise<Job[]> => {
  // Check if API key is configured
  if (!JSEARCH_API_KEY) {
    throw new Error("JSearch API key is not configured. Please add JSEARCH_API_KEY to your .env file.");
  }

  try {
    const searchQuery = `${query}${location ? ` in ${location}` : ""}`;
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=1&num_pages=1`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": JSEARCH_API_KEY,
        "X-RapidAPI-Host": JSEARCH_API_HOST,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      
      if (response.status === 403) {
        throw new Error("403 Forbidden: Invalid API key or subscription expired. Please check your RapidAPI subscription and API key.");
      } else if (response.status === 401) {
        throw new Error("401 Unauthorized: API key is missing or invalid.");
      } else if (response.status === 429) {
        throw new Error("429 Too Many Requests: Rate limit exceeded. Please try again later.");
      }
      throw new Error(`API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

const formatLocation = (job: Job): string => {
  const parts = [];
  if (job.job_city) parts.push(job.job_city);
  if (job.job_state) parts.push(job.job_state);
  if (job.job_country) parts.push(job.job_country);
  return parts.length > 0 ? parts.join(", ") : "Location not specified";
};

const formatSalary = (job: Job): string => {
  if (job.job_min_salary && job.job_max_salary) {
    const currency = job.job_salary_currency || "USD";
    return `${currency} ${job.job_min_salary.toLocaleString()} - ${job.job_max_salary.toLocaleString()}`;
  }
  return "Salary not specified";
};

const truncateDescription = (text: string, maxLength: number = 150): string => {
  if (!text) return "No description available";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
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
      // Format as "Month Day, Year" for older posts
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

const sortJobsByDate = (jobs: Job[]): Job[] => {
  return [...jobs].sort((a, b) => {
    // Jobs with dates come first
    if (!a.job_posted_at_datetime_utc && !b.job_posted_at_datetime_utc) {
      return 0; // Both missing dates, keep original order
    }
    if (!a.job_posted_at_datetime_utc) {
      return 1; // a has no date, put it after b
    }
    if (!b.job_posted_at_datetime_utc) {
      return -1; // b has no date, put it after a
    }
    
    // Sort by date descending (most recent first)
    const dateA = new Date(a.job_posted_at_datetime_utc).getTime();
    const dateB = new Date(b.job_posted_at_datetime_utc).getTime();
    return dateB - dateA; // Descending order
  });
};

export default function Jobs() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>("");
  const [lastSearchLocation, setLastSearchLocation] = useState<string>("");
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobApplicationStatus>>({});
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const trimmedQuery = searchQuery.trim();
    const trimmedLocation = location.trim();
    
    // Log the search query
    console.log("🔍 Job Search:", {
      query: trimmedQuery,
      location: trimmedLocation || "Not specified",
      fullSearch: `${trimmedQuery}${trimmedLocation ? ` in ${trimmedLocation}` : ""}`,
    });

    setIsSearching(true);
    setError(null);
    setJobs([]);
    
    // Store the search query for display
    setLastSearchQuery(trimmedQuery);
    setLastSearchLocation(trimmedLocation);
    
    try {
      const fetchedJobs = await fetchJobs(trimmedQuery, trimmedLocation);
      // Sort jobs by date posted (most recent first)
      const sortedJobs = sortJobsByDate(fetchedJobs);
      setJobs(sortedJobs);
      
      console.log(`✅ Found ${sortedJobs.length} jobs for "${trimmedQuery}${trimmedLocation ? ` in ${trimmedLocation}` : ""}"`);
      
      // Load job statuses if user is authenticated
      if (isAuthenticated && sortedJobs.length > 0) {
        const jobIds = sortedJobs.map((job) => job.job_id);
        const statuses = await getJobStatuses(jobIds);
        setJobStatuses(statuses);
      }
      
      if (sortedJobs.length === 0) {
        setError("No jobs found. Try different keywords or location.");
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to fetch jobs. Please check your API key and try again.";
      setError(errorMessage);
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleApply = async (job: Job) => {
    if (job.job_apply_link) {
      await handleOpenURL(job.job_apply_link);
    } else {
      setError("No application link available for this job.");
    }
  };

  const handleStatusChange = async (job: Job, status: JobApplicationStatus) => {
    if (!isAuthenticated) {
      setError("Please sign in to track your job applications.");
      return;
    }

    setUpdatingStatus(job.job_id);
    try {
      await saveJobStatus(job, status);
      setJobStatuses((prev) => ({
        ...prev,
        [job.job_id]: status,
      }));
      console.log(`Job status updated: ${job.job_title} - ${status}`);
    } catch (err: any) {
      setError(err?.message || "Failed to update job status. Please try again.");
      console.error("Error updating job status:", err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <IconSymbol name="text.document" size={26} color="#3fe1c3" />
              <Text style={styles.title}>Job Search</Text>
            </View>
            {isAuthenticated && (
              <Pressable
                style={({ pressed }) => [
                  styles.viewAppliedButton,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => router.push("/track")}
              >
                <Entypo name="check" size={18} color="#3fe1c3" />
                <Text style={styles.viewAppliedButtonText}>Applied</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.subtitle}>
            Search for job opportunities and apply directly from the app.
          </Text>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Search Jobs</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Title or Keywords</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Software Engineer, Marketing Manager"
              placeholderTextColor="#6f7d83"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New York, Remote"
              placeholderTextColor="#6f7d83"
              value={location}
              onChangeText={setLocation}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              (!searchQuery.trim() || isSearching) && styles.searchButtonDisabled,
              pressed && { opacity: 0.9 },
            ]}
            onPress={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#08090d" />
            ) : (
              <>
                <Entypo name="magnifying-glass" size={20} color="#08090d" />
                <Text style={styles.searchButtonText}>Search Jobs</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* API Key Warning */}
        {!JSEARCH_API_KEY && (
          <View style={styles.warningContainer}>
            <Entypo name="warning" size={20} color="#ffa500" />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>API Key Not Configured</Text>
              <Text style={styles.warningText}>
                Please add JSEARCH_API_KEY to your .env file. Get your free API key from RapidAPI.
              </Text>
            </View>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Entypo name="circle-with-cross" size={20} color="#ff7b7b" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Job Listings */}
        {jobs.length > 0 && (
          <View style={styles.jobsSection}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.sectionTitle}>
                Found {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"}
              </Text>
              {lastSearchQuery && (
                <View style={styles.searchInfoContainer}>
                  <Entypo name="info" size={16} color="#b0c7c0" />
                  <Text style={styles.searchInfoText}>
                    Showing results for: <Text style={styles.searchInfoHighlight}>{lastSearchQuery}</Text>
                    {lastSearchLocation && (
                      <Text> in <Text style={styles.searchInfoHighlight}>{lastSearchLocation}</Text></Text>
                    )}
                  </Text>
                </View>
              )}
            </View>
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
                      <Text style={styles.jobDetailText}>{formatDatePosted(job.job_posted_at_datetime_utc)}</Text>
                    </View>
                  )}
                  {job.job_min_salary && job.job_max_salary && (
                    <View style={styles.jobDetailRow}>
                      <Entypo name="wallet" size={16} color="#b0c7c0" />
                      <Text style={styles.jobDetailText}>{formatSalary(job)}</Text>
                    </View>
                  )}
                </View>

                {job.job_description && (
                  <Text style={styles.jobDescription}>
                    {truncateDescription(job.job_description)}
                  </Text>
                )}

                <View style={styles.jobActions}>
                  {job.job_apply_link && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.applyButton,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => handleApply(job)}
                    >
                      <Text style={styles.applyButtonText}>Apply Now</Text>
                    </Pressable>
                  )}
                  
                  {isAuthenticated && (
                    <View style={styles.statusButtons}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.statusButton,
                          jobStatuses[job.job_id] === "applied" && styles.statusButtonActive,
                          updatingStatus === job.job_id && styles.statusButtonDisabled,
                          pressed && { opacity: 0.9 },
                        ]}
                        onPress={() => handleStatusChange(job, "applied")}
                        disabled={updatingStatus === job.job_id}
                      >
                        {updatingStatus === job.job_id ? (
                          <ActivityIndicator size="small" color={jobStatuses[job.job_id] === "applied" ? "#08090d" : "#3fe1c3"} />
                        ) : (
                          <>
                            <Entypo 
                              name="check" 
                              size={16} 
                              color={jobStatuses[job.job_id] === "applied" ? "#08090d" : "#3fe1c3"} 
                            />
                            <Text style={[
                              styles.statusButtonText,
                              jobStatuses[job.job_id] === "applied" && styles.statusButtonTextActive
                            ]}>
                              Applied
                            </Text>
                          </>
                        )}
                      </Pressable>
                      
                      <Pressable
                        style={({ pressed }) => [
                          styles.statusButton,
                          jobStatuses[job.job_id] === "not_applied" && styles.statusButtonActive,
                          updatingStatus === job.job_id && styles.statusButtonDisabled,
                          pressed && { opacity: 0.9 },
                        ]}
                        onPress={() => handleStatusChange(job, "not_applied")}
                        disabled={updatingStatus === job.job_id}
                      >
                        {updatingStatus === job.job_id ? (
                          <ActivityIndicator size="small" color={jobStatuses[job.job_id] === "not_applied" ? "#08090d" : "#3fe1c3"} />
                        ) : (
                          <>
                            <Entypo 
                              name="cross" 
                              size={16} 
                              color={jobStatuses[job.job_id] === "not_applied" ? "#08090d" : "#3fe1c3"} 
                            />
                            <Text style={[
                              styles.statusButtonText,
                              jobStatuses[job.job_id] === "not_applied" && styles.statusButtonTextActive
                            ]}>
                              Not Applied
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Popular Job Boards */}
        {jobs.length === 0 && !isSearching && (
          <View style={styles.jobBoardsSection}>
            <Text style={styles.sectionTitle}>Popular Job Boards</Text>
            <View style={styles.jobBoardsGrid}>
              {POPULAR_JOB_BOARDS.map((board, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.jobBoardCard,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => handleOpenURL(board.url)}
                >
                  <Entypo name={board.icon as any} size={24} color="#3fe1c3" />
                  <Text style={styles.jobBoardName}>{board.name}</Text>
                </Pressable>
              ))}
            </View>
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
    justifyContent: "space-between",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  viewAppliedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3fe1c3",
    backgroundColor: "transparent",
  },
  viewAppliedButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3fe1c3",
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
  searchSection: {
    backgroundColor: "#11141b",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.3)",
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: "white",
    fontWeight: "700",
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#d7e0de",
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#08090d",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "white",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: "#3fe1c3",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#08090d",
  },
  jobBoardsSection: {
    gap: 16,
  },
  jobBoardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  jobBoardCard: {
    backgroundColor: "#11141b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(63, 225, 195, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "47%",
    gap: 8,
  },
  jobBoardName: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#2a1f1f",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 123, 123, 0.3)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  errorText: {
    color: "#ff7b7b",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  warningContainer: {
    backgroundColor: "#2a241f",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 165, 0, 0.3)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    color: "#ffa500",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  warningText: {
    color: "#ffa500",
    fontSize: 14,
    lineHeight: 20,
  },
  jobsSection: {
    gap: 16,
  },
  searchResultsHeader: {
    gap: 8,
  },
  searchInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  searchInfoText: {
    fontSize: 14,
    color: "#b0c7c0",
    flex: 1,
  },
  searchInfoHighlight: {
    color: "#3fe1c3",
    fontWeight: "600",
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
  jobDescription: {
    fontSize: 14,
    color: "#d7e0de",
    lineHeight: 20,
    marginTop: 8,
  },
  jobActions: {
    gap: 10,
    marginTop: 8,
  },
  applyButton: {
    backgroundColor: "#3fe1c3",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  applyButtonDisabled: {
    backgroundColor: "#2a2a2a",
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#08090d",
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3fe1c3",
    backgroundColor: "transparent",
  },
  statusButtonActive: {
    backgroundColor: "#3fe1c3",
    borderColor: "#3fe1c3",
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3fe1c3",
  },
  statusButtonTextActive: {
    color: "#08090d",
  },
});
