import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import type { Job } from "@/app/(tabs)/jobs";

export type JobApplicationStatus = "applied" | "not_applied";

export type TrackedJob = Job & {
  status: JobApplicationStatus;
  trackedAt: Date;
  appliedAt?: Date;
};

/**
 * Save or update job application status in Firebase
 */
export async function saveJobStatus(
  job: Job,
  status: JobApplicationStatus
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated to track jobs");
  }

  try {
    const jobRef = doc(db, "users", user.uid, "appliedJobs", job.job_id);
    await setDoc(
      jobRef,
      {
        ...job,
        status,
        trackedAt: serverTimestamp(),
        appliedAt: status === "applied" ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`Job status saved: ${job.job_title} - ${status}`);
  } catch (error) {
    console.error("Error saving job status:", error);
    throw error;
  }
}

/**
 * Get application status for a specific job
 */
export async function getJobStatus(jobId: string): Promise<JobApplicationStatus | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  try {
    const jobRef = doc(db, "users", user.uid, "appliedJobs", jobId);
    const snapshot = await getDoc(jobRef);
    
    if (snapshot.exists()) {
      return snapshot.data().status as JobApplicationStatus;
    }
    return null;
  } catch (error) {
    console.error("Error getting job status:", error);
    return null;
  }
}

/**
 * Get all tracked jobs with their status
 */
export async function getAllTrackedJobs(): Promise<TrackedJob[]> {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const jobsRef = collection(db, "users", user.uid, "appliedJobs");
    const snapshot = await getDocs(jobsRef);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        status: data.status as JobApplicationStatus,
        trackedAt: data.trackedAt?.toDate() || new Date(),
        appliedAt: data.appliedAt?.toDate(),
      } as TrackedJob;
    });
  } catch (error) {
    console.error("Error getting tracked jobs:", error);
    return [];
  }
}

/**
 * Get jobs by status (applied or not_applied)
 */
export async function getJobsByStatus(status: JobApplicationStatus): Promise<TrackedJob[]> {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const jobsRef = collection(db, "users", user.uid, "appliedJobs");
    const q = query(jobsRef, where("status", "==", status));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        status: data.status as JobApplicationStatus,
        trackedAt: data.trackedAt?.toDate() || new Date(),
        appliedAt: data.appliedAt?.toDate(),
      } as TrackedJob;
    });
  } catch (error) {
    console.error("Error getting jobs by status:", error);
    return [];
  }
}

/**
 * Remove a job from tracking
 */
export async function removeJobTracking(jobId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated to remove job tracking");
  }

  try {
    const jobRef = doc(db, "users", user.uid, "appliedJobs", jobId);
    await deleteDoc(jobRef);
    console.log(`Job tracking removed: ${jobId}`);
  } catch (error) {
    console.error("Error removing job tracking:", error);
    throw error;
  }
}

/**
 * Get application statuses for multiple jobs at once
 */
export async function getJobStatuses(jobIds: string[]): Promise<Record<string, JobApplicationStatus>> {
  const user = auth.currentUser;
  if (!user || jobIds.length === 0) {
    return {};
  }

  try {
    const statuses: Record<string, JobApplicationStatus> = {};
    
    // Fetch all job statuses in parallel
    const promises = jobIds.map(async (jobId) => {
      const status = await getJobStatus(jobId);
      if (status) {
        statuses[jobId] = status;
      }
    });
    
    await Promise.all(promises);
    return statuses;
  } catch (error) {
    console.error("Error getting job statuses:", error);
    return {};
  }
}

