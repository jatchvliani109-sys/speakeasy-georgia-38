// Shared scenario catalog for the Speaking path.
// Used by AISpeakingCall, the progression map, and the daily mission picker.

import {
  Handshake, GraduationCap, Users as UsersIcon, Coffee, Palette, Clock3,
  UtensilsCrossed, Map as MapIcon, ShoppingBag, Plane, CalendarDays,
  Briefcase, MessageSquare, CalendarRange, Globe2, Puzzle, MessagesSquare,
  type LucideIcon,
} from "lucide-react";

export type ScenarioGroup = "Beginner" | "Elementary" | "Intermediate" | "Free";

export type Scenario = {
  id: string;
  group: ScenarioGroup;
  title_en: string;
  desc_ka: string;
  Icon: LucideIcon;
};

export const SCENARIOS: Scenario[] = [
  { id: "intro", group: "Beginner", title_en: "Introducing Yourself", desc_ka: "გაიცანი AI და ისაუბრე საკუთარ თავზე.", Icon: Handshake },
  { id: "school", group: "Beginner", title_en: "School", desc_ka: "ისაუბრე სკოლაზე და საგნებზე.", Icon: GraduationCap },
  { id: "family", group: "Beginner", title_en: "Family", desc_ka: "ისაუბრე ოჯახის წევრებზე.", Icon: UsersIcon },
  { id: "cafe", group: "Beginner", title_en: "At a Café", desc_ka: "შეუკვეთე სასმელი და ილაპარაკე ოფიციანტთან.", Icon: Coffee },
  { id: "hobbies", group: "Beginner", title_en: "Hobbies", desc_ka: "მოყევი რა გიყვარს თავისუფალ დროს.", Icon: Palette },
  { id: "routine", group: "Beginner", title_en: "Daily Routine", desc_ka: "ისაუბრე შენს დღიურ რუტინაზე.", Icon: Clock3 },

  { id: "ordering", group: "Elementary", title_en: "Ordering Food", desc_ka: "შეუკვეთე საჭმელი რესტორანში.", Icon: UtensilsCrossed },
  { id: "directions", group: "Elementary", title_en: "Asking for Directions", desc_ka: "ჰკითხე გზა ქალაქში.", Icon: MapIcon },
  { id: "shopping", group: "Elementary", title_en: "Shopping", desc_ka: "იყიდე ტანსაცმელი ან ჰკითხე ფასი.", Icon: ShoppingBag },
  { id: "travel", group: "Elementary", title_en: "Travel Basics", desc_ka: "სასტუმრო, ბილეთი, აეროპორტი.", Icon: Plane },
  { id: "weekend", group: "Elementary", title_en: "Weekend Plans", desc_ka: "დაგეგმე შაბათ-კვირა მეგობართან.", Icon: CalendarDays },

  { id: "interview", group: "Intermediate", title_en: "Job Interview", desc_ka: "ივარჯიშე გასაუბრებაზე.", Icon: Briefcase },
  { id: "opinions", group: "Intermediate", title_en: "Giving Opinions", desc_ka: "გამოთქვი აზრი თემაზე.", Icon: MessageSquare },
  { id: "plans", group: "Intermediate", title_en: "Making Plans", desc_ka: "შეთანხმდი მეგობართან გეგმაზე.", Icon: CalendarRange },
  { id: "travel_conv", group: "Intermediate", title_en: "Travel Conversation", desc_ka: "ისაუბრე მოგზაურობის გამოცდილებაზე.", Icon: Globe2 },
  { id: "problem", group: "Intermediate", title_en: "Problem Solving", desc_ka: "გადაჭერი სიტუაცია მხარდაჭერასთან.", Icon: Puzzle },

  { id: "free", group: "Free", title_en: "Free Conversation", desc_ka: "ისაუბრე ნებისმიერ თემაზე.", Icon: MessagesSquare },
];

export const GROUP_LABEL_KA: Record<ScenarioGroup, string> = {
  Beginner: "მარტივი",
  Elementary: "საშუალო",
  Intermediate: "რთული",
  Free: "თავისუფალი",
};

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
