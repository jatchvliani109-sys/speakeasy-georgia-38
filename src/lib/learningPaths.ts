export type LearningPathId =
  | "general_english"
  | "speaking"
  | "writing"
  | "business_english"
  | "school_children"
  | "national_exam";

export type LearningPath = {
  id: LearningPathId;
  title: string;
  description: string;
  icon: string;
  route: string;
};

export const LEARNING_PATHS: LearningPath[] = [
  { id: "general_english",  title: "ზოგადი ინგლისური",                       description: "გააუმჯობესე გრამატიკა, ლექსიკა და ყოველდღიური ინგლისური.",                                icon: "🌍", route: "/path/general" },
  { id: "speaking",         title: "საუბრის გაუმჯობესება",                   description: "ივარჯიშე საუბარში, გამოთქმაში და თავდაჯერებულობაში.",                                    icon: "🎙️", route: "/path/speaking" },
  { id: "writing",          title: "წერის გაუმჯობესება",                     description: "ისწავლე ესეების, იმეილების და სწორი წინადადებების წერა.",                                icon: "✍️", route: "/path/writing" },
  { id: "business_english", title: "ბიზნეს ინგლისური",                       description: "მოემზადე გასაუბრებისთვის, სამსახურისთვის, შეხვედრებისთვის და პროფესიული კომუნიკაციისთვის.", icon: "💼", route: "/path/business" },
  { id: "school_children",  title: "სკოლის ინგლისური",                       description: "მარტივი და სახალისო ინგლისური სკოლის მოსწავლეებისთვის.",                                  icon: "🎒", route: "/path/school" },
  { id: "national_exam",    title: "ეროვნული გამოცდები / აბიტურიენტები",     description: "მოემზადე ინგლისურის ეროვნული გამოცდისთვის სტრუქტურირებული გაკვეთილებით, ტესტებით და ახსნებით.", icon: "🎓", route: "/path/exam" },
];

export function pathById(id?: string | null): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.id === id);
}
