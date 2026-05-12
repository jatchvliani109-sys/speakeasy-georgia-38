// Static data for the Speaking learning path

export type Phrase = {
  english: string;
  georgian: string;
  example?: string;
};

export type Scenario = {
  id: string;
  level: "Beginner" | "Elementary" | "Intermediate";
  emoji: string;
  title_ka: string;
  description_ka: string;
  topic: string;          // English topic for AI
  userRole: string;       // English
  userRole_ka: string;
  aiRole: string;         // English
  aiRole_ka: string;
  starters_ka?: string[]; // Suggested reply chips for beginners (Georgian-friendly hints)
};

export const PRONUNCIATION_BANK: Record<string, Phrase[]> = {
  Beginner: [
    { english: "student", georgian: "მოსწავლე / სტუდენტი", example: "I am a student." },
    { english: "teacher", georgian: "მასწავლებელი", example: "She is my teacher." },
    { english: "school", georgian: "სკოლა", example: "I go to school." },
    { english: "I am from Georgia.", georgian: "მე ვარ საქართველოდან." },
    { english: "My name is Ana.", georgian: "მე მქვია ანა." },
    { english: "Nice to meet you.", georgian: "სასიამოვნოა გაცნობა." },
    { english: "How are you?", georgian: "როგორ ხარ?" },
    { english: "Thank you very much.", georgian: "დიდი მადლობა." },
  ],
  Elementary: [
    { english: "I like coffee.", georgian: "მე მიყვარს ყავა." },
    { english: "I usually wake up at 7.", georgian: "მე ჩვეულებრივ ვიღვიძებ 7-ზე." },
    { english: "Can I have some water?", georgian: "შეიძლება წყალი მომიტანოთ?" },
    { english: "I need help.", georgian: "მე დახმარება მჭირდება." },
    { english: "Where is the bathroom?", georgian: "სად არის საპირფარეშო?" },
    { english: "How much does it cost?", georgian: "რა ღირს?" },
  ],
  Intermediate: [
    { english: "In my opinion, this is the best option.", georgian: "ჩემი აზრით, ეს საუკეთესო ვარიანტია." },
    { english: "Could you explain that again, please?", georgian: "შეგიძლიათ თავიდან ამიხსნათ?" },
    { english: "I'd rather stay home tonight.", georgian: "მირჩევნია სახლში დავრჩე საღამოს." },
    { english: "That sounds like a great idea.", georgian: "ეს კარგ იდეად მეჩვენება." },
  ],
};

export const SCENARIOS: Scenario[] = [
  // Beginner
  {
    id: "meet_friend", level: "Beginner", emoji: "👋",
    title_ka: "ახალი მეგობრის გაცნობა", description_ka: "გაიცანი ახალი ადამიანი და უპასუხე მარტივ კითხვებს.",
    topic: "Meeting a new friend",
    userRole: "You", userRole_ka: "შენ",
    aiRole: "A new classmate at school", aiRole_ka: "ახალი თანაკლასელი",
    starters_ka: ["Hi! My name is...", "I am from Georgia.", "Nice to meet you!"],
  },
  {
    id: "at_school", level: "Beginner", emoji: "🎒",
    title_ka: "სკოლაში", description_ka: "ისაუბრე სკოლაზე, საგნებზე და მასწავლებლებზე.",
    topic: "At school",
    userRole: "Student", userRole_ka: "მოსწავლე",
    aiRole: "A friendly teacher", aiRole_ka: "მასწავლებელი",
    starters_ka: ["I like English.", "My favorite subject is...", "I have homework."],
  },
  {
    id: "at_cafe_basic", level: "Beginner", emoji: "☕",
    title_ka: "კაფეში", description_ka: "შეუკვეთე სასმელი ან საჭმელი მარტივი ფრაზებით.",
    topic: "At a café",
    userRole: "Customer", userRole_ka: "კლიენტი",
    aiRole: "A friendly waiter", aiRole_ka: "ოფიციანტი",
    starters_ka: ["I would like a coffee, please.", "Thank you.", "How much is it?"],
  },
  {
    id: "family_talk", level: "Beginner", emoji: "👨‍👩‍👧",
    title_ka: "ოჯახზე საუბარი", description_ka: "ისაუბრე შენი ოჯახის წევრებზე.",
    topic: "Talking about family",
    userRole: "You", userRole_ka: "შენ",
    aiRole: "A curious friend", aiRole_ka: "მეგობარი",
    starters_ka: ["I have a brother.", "My mother is a teacher.", "We live in Tbilisi."],
  },
  // Elementary
  {
    id: "order_food", level: "Elementary", emoji: "🍽️",
    title_ka: "საჭმლის შეკვეთა", description_ka: "შეუკვეთე საჭმელი რესტორანში, ჰკითხე მენიუზე.",
    topic: "Ordering food",
    userRole: "Customer", userRole_ka: "კლიენტი",
    aiRole: "A waiter", aiRole_ka: "ოფიციანტი",
    starters_ka: ["Can I see the menu?", "I'll have the chicken.", "Could I get the bill?"],
  },
  {
    id: "directions", level: "Elementary", emoji: "🗺️",
    title_ka: "გზის კითხვა", description_ka: "იპოვე გზა — ჰკითხე ადგილზე.",
    topic: "Asking for directions",
    userRole: "Tourist", userRole_ka: "ტურისტი",
    aiRole: "A local person", aiRole_ka: "ადგილობრივი",
    starters_ka: ["Excuse me, where is...?", "How do I get to...?", "Is it far from here?"],
  },
  {
    id: "shopping", level: "Elementary", emoji: "🛍️",
    title_ka: "მაღაზიაში", description_ka: "იყიდე ტანსაცმელი ან ჰკითხე ფასი.",
    topic: "Shopping",
    userRole: "Shopper", userRole_ka: "მყიდველი",
    aiRole: "A shop assistant", aiRole_ka: "კონსულტანტი",
    starters_ka: ["How much is this?", "Do you have it in blue?", "I'll take it."],
  },
  {
    id: "travel_basics", level: "Elementary", emoji: "✈️",
    title_ka: "მოგზაურობის საფუძვლები", description_ka: "ისაუბრე აეროპორტში ან სასტუმროში.",
    topic: "Travel basics",
    userRole: "Traveler", userRole_ka: "მოგზაური",
    aiRole: "A hotel receptionist", aiRole_ka: "სასტუმროს თანამშრომელი",
    starters_ka: ["I have a reservation.", "What time is breakfast?", "Could I have the wifi password?"],
  },
  // Intermediate
  {
    id: "interview", level: "Intermediate", emoji: "💼",
    title_ka: "სამუშაო გასაუბრება", description_ka: "ივარჯიშე გასაუბრებაზე და ისაუბრე შენს გამოცდილებაზე.",
    topic: "Job interview",
    userRole: "Candidate", userRole_ka: "კანდიდატი",
    aiRole: "A hiring manager", aiRole_ka: "დამსაქმებელი",
  },
  {
    id: "opinions", level: "Intermediate", emoji: "💭",
    title_ka: "მოსაზრების გამოთქმა", description_ka: "გამოთქვი შენი აზრი თემაზე და დაასაბუთე.",
    topic: "Giving opinions",
    userRole: "Speaker", userRole_ka: "მოსაუბრე",
    aiRole: "A discussion partner", aiRole_ka: "მოსაუბრე",
  },
  {
    id: "problem_solving", level: "Intermediate", emoji: "🧩",
    title_ka: "პრობლემის გადაჭრა", description_ka: "ერთად მოძებნე გამოსავალი სიტუაციისთვის.",
    topic: "Solving a problem",
    userRole: "Customer", userRole_ka: "კლიენტი",
    aiRole: "A customer support agent", aiRole_ka: "მხარდაჭერის აგენტი",
  },
  {
    id: "make_plans", level: "Intermediate", emoji: "📅",
    title_ka: "გეგმების დაგეგმვა", description_ka: "შეთანხმდი მეგობართან შეხვედრის ან გასვლის თაობაზე.",
    topic: "Making plans",
    userRole: "You", userRole_ka: "შენ",
    aiRole: "A friend", aiRole_ka: "მეგობარი",
  },
];

// Default daily lesson fallback used when the AI plan can't be fetched.
export const DEFAULT_DAILY_LESSON = {
  title_en: "Introducing Yourself",
  title_ka: "საკუთარი თავის წარდგენა",
  goal_ka: "ისწავლე როგორ წარადგინო შენი თავი ინგლისურად.",
  topic: "Introducing Yourself",
  estimated_minutes: 7,
  warmup_questions: ["What is your name?", "Where are you from?", "How old are you?"],
  new_words: [
    { english_word: "My name is...", georgian_meaning: "მე მქვია...", example_sentence: "My name is Ana." },
    { english_word: "I am from Georgia.", georgian_meaning: "მე ვარ საქართველოდან.", example_sentence: "I am from Georgia." },
    { english_word: "Nice to meet you.", georgian_meaning: "სასიამოვნოა გაცნობა.", example_sentence: "Nice to meet you, John." },
  ],
  practice_intro: "Let's practice. Tell me your name.",
};

export const SUGGESTED_NEXT_TOPICS = [
  "Talking about hobbies",
  "Daily routine",
  "Ordering food",
  "Talking about family",
  "Weekend plans",
  "Travel basics",
];

// Daily lesson topic pool — used to rotate fresh topics by level.
export const DAILY_TOPIC_POOL: Record<"Beginner" | "Elementary" | "Intermediate", string[]> = {
  Beginner: [
    "Introducing Yourself",
    "At School",
    "Family",
    "At a Café",
    "Hobbies",
    "Daily Routine",
  ],
  Elementary: [
    "Ordering Food",
    "Asking for Directions",
    "Shopping",
    "Weekend Plans",
    "Travel Basics",
    "Talking About Likes",
  ],
  Intermediate: [
    "Job Interview Basics",
    "Giving Opinions",
    "Making Plans",
    "Describing Experiences",
    "Solving Problems",
    "Travel Conversation",
  ],
};

export function pickDailyTopic(
  level: string,
  recent: string[],
): string {
  const key: "Beginner" | "Elementary" | "Intermediate" = /inter/i.test(level)
    ? "Intermediate"
    : /element|pre/i.test(level)
    ? "Elementary"
    : /adv/i.test(level)
    ? "Intermediate"
    : "Beginner";
  const pool = DAILY_TOPIC_POOL[key];
  const recentLower = recent.map((r) => r.toLowerCase().trim());
  const fresh = pool.filter((t) => !recentLower.includes(t.toLowerCase()));
  const candidates = fresh.length ? fresh : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
