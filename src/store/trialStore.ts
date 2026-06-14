export interface TrialCard {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string;
  participants: number;
}
