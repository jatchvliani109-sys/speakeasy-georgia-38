export type LearningPathId =
  | "business_english";

export type LearningPath = {
  id: LearningPathId;
  title: string;
  description: string;
  icon: string;
  route: string;
};

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "business_english",
    title: "ბიზნეს ინგლისური",
    description: "გასაუბრება, სამუშაო იმეილები, შეხვედრები და პროფესიული კომუნიკაცია.",
    icon: "💼",
    route: "/path/business",
  },
  {
    id: "national_exam",
    title: "ეროვნული გამოცდები / აბიტურიენტები",
    description: "მოემზადე ინგლისურის გამოცდისთვის გრამატიკით, ტექსტებით და ტესტებით.",
    icon: "🎓",
    route: "/path/exam",
  },
];

export const VALID_PATH_IDS: LearningPathId[] = LEARNING_PATHS.map((p) => p.id);

export function pathById(id?: string | null): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.id === id);
}
