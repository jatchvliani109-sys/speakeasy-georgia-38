export type LearningPathId =
  | "general_english"
  | "speaking"
  | "writing"
  | "business_english"
  | "school_children"
  | "national_exam";

export const LEARNING_PATHS: {
  id: LearningPathId;
  title: string;
  description: string;
  icon: string;
  route: string;
}[] = [
  { id: "general_english",  title: "ზოგადი ინგლისური",                title: "ზოგადი ინგლისური", description: "გააუმჯობესე გრამატიკა, ლექსიკა და ყოველდღიური ინგლისური.", icon: "🌍", route: "/path/general" } as any,
];
