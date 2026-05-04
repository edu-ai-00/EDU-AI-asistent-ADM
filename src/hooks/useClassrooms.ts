import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  Classroom,
  CreateClassroomPayload,
  UpdateClassroomPayload,
  AddStudentsPayload,
  AssignedCourse,
  AssignCoursesPayload,
} from "@/types/classroom";
import type { CourseSkillsOverview } from "@/types/skills";

const CLASSROOMS_KEY = ["classrooms"];

export function useClassrooms() {
  return useQuery({
    queryKey: CLASSROOMS_KEY,
    queryFn: () => api.get<Classroom[]>("/admin/classrooms"),
  });
}

export function useClassroom(id: number | null) {
  return useQuery({
    queryKey: ["classrooms", id],
    queryFn: () => api.get<Classroom>(`/admin/classrooms/${id}`),
    enabled: id !== null,
  });
}

export function useCreateClassroom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateClassroomPayload) =>
      api.post<Classroom>("/admin/classrooms", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSROOMS_KEY });
    },
  });
}

export function useUpdateClassroom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateClassroomPayload & { id: number }) =>
      api.put<Classroom>(`/admin/classrooms/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: CLASSROOMS_KEY });
      queryClient.invalidateQueries({ queryKey: ["classrooms", variables.id] });
    },
  });
}

export function useAddStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classroomId, ...payload }: AddStudentsPayload & { classroomId: number }) =>
      api.post<Classroom>(`/admin/classrooms/${classroomId}/students`, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: CLASSROOMS_KEY });
      queryClient.invalidateQueries({ queryKey: ["classrooms", variables.classroomId] });
    },
  });
}

export function useDeleteClassroom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      api.delete<void>(`/admin/classrooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSROOMS_KEY });
    },
  });
}

export function useClassroomCourses(id: number | null) {
  return useQuery({
    queryKey: ["classrooms", id, "courses"],
    queryFn: () => api.get<AssignedCourse[]>(`/admin/classrooms/${id}/courses`),
    enabled: id !== null,
  });
}

export function useAssignCourses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classroomId, ...payload }: AssignCoursesPayload & { classroomId: number }) =>
      api.post<void>(`/admin/classrooms/${classroomId}/courses`, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["classrooms", variables.classroomId, "courses"] });
      queryClient.invalidateQueries({ queryKey: ["classrooms", variables.classroomId] });
    },
  });
}

export function useClassroomEnrolledCourses(id: number | null) {
  return useQuery({
    queryKey: ["classrooms", id, "enrolled-courses"],
    queryFn: () => api.get<AssignedCourse[]>(`/admin/classrooms/${id}/enrolled-courses`),
    enabled: id !== null,
  });
}

export function useClassroomSkillsOverview(
  classroomId: number | null,
  courseId: number | null,
  aggregated = false
) {
  return useQuery({
    queryKey: ["classrooms", classroomId, "skills-overview", courseId, aggregated],
    queryFn: () => {
      const params = new URLSearchParams();
      if (courseId !== null) params.set("course_id", String(courseId));
      if (aggregated) params.set("aggregated", "true");
      return api.get<CourseSkillsOverview>(
        `/admin/classrooms/${classroomId}/skills/overview?${params.toString()}`
      );
    },
    enabled: classroomId !== null && courseId !== null,
  });
}

export function useRemoveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classroomId, courseId }: { classroomId: number; courseId: number }) =>
      api.delete<void>(`/admin/classrooms/${classroomId}/courses/${courseId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["classrooms", variables.classroomId, "courses"] });
      queryClient.invalidateQueries({ queryKey: ["classrooms", variables.classroomId] });
    },
  });
}
