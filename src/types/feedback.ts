export interface ContentFeedback {
  id: number;
  user: { id: number; name: string; email: string };
  course_id: string;
  block_id: string;
  lesson_id: string | null;
  type: "question" | "like" | "dislike";
  message: string | null;
  created_at: string;
}
