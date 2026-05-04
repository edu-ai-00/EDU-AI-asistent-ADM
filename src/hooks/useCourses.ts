import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Course, UpdateCourseInput, DownloadResponse } from "@/types/api";
import type { CourseV2 } from "@/types/block-v2";

const COURSES_KEY = ["courses"];

// List all courses (optionally including soft-deleted)
export function useCourses(withTrashed = false) {
  return useQuery({
    queryKey: [...COURSES_KEY, { withTrashed }],
    queryFn: () =>
      api.get<Course[]>(
        withTrashed ? "/courses?with_trashed=1" : "/courses"
      ),
  });
}

// Restore a soft-deleted course
export function useRestoreCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post<Course>(`/courses/${id}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

// Get a single course metadata
export function useCourse(id: number | undefined) {
  return useQuery({
    queryKey: ["courses", id],
    queryFn: () => api.get<Course>(`/courses/${id}`),
    enabled: !!id,
  });
}

// Get course download URL and fetch full course data
export function useCourseData(id: number | undefined) {
  return useQuery({
    queryKey: ["courses", id, "data"],
    queryFn: async () => {
      // First get the signed download URL
      const downloadInfo = await api.get<DownloadResponse>(`/admin/courses/${id}/download`);
      // Then fetch the actual course JSON from R2
      const response = await fetch(downloadInfo.download_url);
      if (!response.ok) {
        throw new Error("Failed to download course data");
      }
      return response.json() as Promise<CourseV2>;
    },
    enabled: !!id,
  });
}

// Upload a new course (or update existing via course_id)
export function useUploadCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseData: CourseV2) => api.uploadCourse<Course>(courseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      // Also invalidate the specific course data cache
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

// Update course metadata (not the full JSON content)
export function useUpdateCourse(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCourseInput) =>
      api.put<Course>(`/courses/${id}`, data),
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(["courses", id], updatedCourse);
      queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

// Update course status (publish/unpublish/etc)
export function useUpdateCourseStatus(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: Course["status"]) =>
      api.put<Course>(`/courses/${id}`, { status }),
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(["courses", id], updatedCourse);
      queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}

// Delete a course
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSES_KEY });
    },
  });
}
