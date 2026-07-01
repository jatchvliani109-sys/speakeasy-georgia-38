// Pre-made Business English email lessons for Georgian speakers.
// Replaces live AI generation for lesson CONTENT (the teaching part).
// Live AI is still used for feedback on what the user writes.
//
// Structure mirrors what the email module already expects, with two changes:
//  - removed `tomorrowTeaseKa` (dynamic "tomorrow" wording doesn't fit fixed content)
//  - added `readAloudPhrases` (clean English lines for the TTS speaker buttons)
//
// Keyed by [topicKey][level]. Levels:
//   business_beginner | business_elementary | business_intermediate | business_advanced

export type Level =
  | "business_beginner"
  | "business_elementary"
  | "business_intermediate"
  | "business_advanced";

export type WarmUpOption = {
  label: string;          // "A" | "B"
  text: string;           // English sentence/email
  isBetter: boolean;
  issuesKa: string[];     // Georgian bullets explaining problems (empty if it's the better one)
};

export type WarmUp = {
  kind: "spot_mistakes" | "compare";
  promptKa: string;
  options: WarmUpOption[];
  explanationKa: string;
};

export type StructurePart = {
  partKa: string;
  purposeKa: string;
  exampleEn: string;
};

export type LearnExample = {
  en: string;
  ka: string;
  noteKa?: string;
};

export type Learn = {
  titleKa: string;
  explanationKa: string;
  structure: StructurePart[];
  examples: LearnExample[];
};

export type RealExample = {
  contextKa: string;
  subject: string;
  body: string;
  annotationsKa: string[];
};

export type Practice = {
  scenarioKa: string;
  recipientRole: string;
  promptKa: string;
  hintsKa: string[];
};

export type VocabItem = {
  en: string;
  ka: string;
  exampleEn: string;
  exampleKa: string;
};

export type EmailLesson = {
  emailType: string;        // matches curriculum key
  level: Level;
  dailyFocusKa: string;
  estimatedMinutes: number;
  warmUp: WarmUp;
  learn: Learn;
  realExample: RealExample;
  practice: Practice;
  vocabulary: VocabItem[];
  readAloudPhrases: string[]; // English phrases for TTS speaker buttons
};

// ============================================================
// TOPIC 1: INTRODUCTION (გაცნობის წერილი)
// ============================================================

const introduction: Record<Level, EmailLesson> = {
  // ---------------- BEGINNER ----------------
  business_beginner: {
    emailType: "introduction",
    level: "business_beginner",
    dailyFocusKa: "დღეს ვისწავლით მარტივი გაცნობის წერილის დაწერას — მისალმება, ვინ ხარ, და თავაზიანი დასასრული.",
    estimatedMinutes: 10,
    warmUp: {
      kind: "compare",
      promptKa: "რომელი მისალმება უფრო პროფესიულია იმეილში?",
      options: [
        {
          label: "A",
          text: "Hi! I am Nino. Nice to meet you.",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "hey whats up im nino",
          isBetter: false,
          issuesKa: [
            "არ იწყება დიდი ასოთი და არ აქვს პუნქტუაცია.",
            "'whats up' ძალიან არაფორმალურია სამუშაო იმეილისთვის.",
          ],
        },
      ],
      explanationKa:
        "პირველი ვარიანტი თავაზიანი და მკაფიოა. იმეილში ყოველთვის ვიწყებთ დიდი ასოთი და ვამთავრებთ პუნქტუაციით.",
    },
    learn: {
      titleKa: "გაცნობის წერილის სამი ნაწილი",
      explanationKa:
        "მარტივ გაცნობის წერილს აქვს სამი ნაწილი: მისალმება, შენი სახელი და როლი, და თავაზიანი დასასრული. მოკლე და ნათელი იყავი.",
      structure: [
        {
          partKa: "მისალმება",
          purposeKa: "თავაზიანად დაიწყე.",
          exampleEn: "Hello,",
        },
        {
          partKa: "ვინ ხარ",
          purposeKa: "თქვი შენი სახელი და როლი.",
          exampleEn: "My name is Nino. I am a designer.",
        },
        {
          partKa: "დასასრული",
          purposeKa: "თავაზიანად დაასრულე.",
          exampleEn: "Nice to meet you. Best, Nino",
        },
      ],
      examples: [
        {
          en: "My name is Giorgi.",
          ka: "მე მქვია გიორგი.",
          noteKa: "მარტივი და მკაფიო გზა საკუთარი თავის წარსადგენად.",
        },
        {
          en: "I work as a sales manager.",
          ka: "მე ვმუშაობ გაყიდვების მენეჯერად.",
        },
        {
          en: "Nice to meet you.",
          ka: "სასიამოვნოა თქვენი გაცნობა.",
        },
      ],
    },
    realExample: {
      contextKa: "ნინო ახალი თანამშრომელია. ის უგზავნის მოკლე გაცნობის წერილს გუნდს.",
      subject: "Hello from Nino",
      body: "Hello,\n\nMy name is Nino. I am a new designer on the team.\n\nI am happy to be here. I look forward to working with you.\n\nBest,\nNino",
      annotationsKa: [
        "მისალმება მარტივი და თავაზიანია.",
        "ნინო ამბობს სახელს და როლს ერთ მოკლე წინადადებაში.",
        "დასასრული თბილი და პროფესიულია.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ ახალი თანამშრომელი ხარ კომპანიაში. დაწერე მოკლე გაცნობის წერილი შენი ახალი გუნდისთვის. თქვი შენი სახელი, შენი როლი და თბილი მისალმება.",
      recipientRole: "your new team",
      promptKa: "დაწერე 3-4 მოკლე წინადადება. გამოიყენე მისალმება, სახელი, როლი და დასასრული.",
      hintsKa: [
        "დაიწყე 'Hello,'-თი.",
        "გამოიყენე 'My name is...' და 'I am a...'.",
        "დაასრულე 'Best,' და შენი სახელით.",
      ],
    },
    vocabulary: [
      {
        en: "introduce",
        ka: "გაცნობა / წარდგენა",
        exampleEn: "Let me introduce myself.",
        exampleKa: "ნება მომეცით წარმოგიდგინოთ ჩემი თავი.",
      },
      {
        en: "team",
        ka: "გუნდი",
        exampleEn: "I am happy to join the team.",
        exampleKa: "მოხარული ვარ, რომ გუნდს შევუერთდი.",
      },
      {
        en: "role",
        ka: "როლი / პოზიცია",
        exampleEn: "My role is designer.",
        exampleKa: "ჩემი როლი დიზაინერია.",
      },
    ],
    readAloudPhrases: [
      "Hello, my name is Nino.",
      "I am a new designer on the team.",
      "I look forward to working with you.",
      "Nice to meet you.",
    ],
  },

  // ---------------- ELEMENTARY ----------------
  business_elementary: {
    emailType: "introduction",
    level: "business_elementary",
    dailyFocusKa: "დღეს ვისწავლით გაცნობის წერილს, რომელშიც ვამბობთ ვინ ვართ და რას ვაკეთებთ მოკლე, ნათელი წინადადებებით.",
    estimatedMinutes: 12,
    warmUp: {
      kind: "compare",
      promptKa: "რომელი შესავალი უფრო ნათელია ახალი კოლეგისთვის?",
      options: [
        {
          label: "A",
          text: "My name is Davit and I am the new marketing assistant. I started this week.",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi, I am new here and I do some things for the company.",
          isBetter: false,
          issuesKa: [
            "'some things' ბუნდოვანია — არ ჩანს რას აკეთებ.",
            "არ ამბობს კონკრეტულ როლს ან განყოფილებას.",
          ],
        },
      ],
      explanationKa:
        "კარგი გაცნობა ნათლად ამბობს შენს როლს. 'marketing assistant' ბევრად უკეთესია ვიდრე 'some things'.",
    },
    learn: {
      titleKa: "ნათელი გაცნობა: სახელი, როლი, კონტექსტი",
      explanationKa:
        "კარგი გაცნობის წერილი ამბობს სამ რამეს: ვინ ხარ, რა არის შენი როლი, და ცოტა კონტექსტი (მაგ. როდის დაიწყე ან რომელ გუნდში ხარ). ეს ეხმარება ხალხს დაგამახსოვრონ.",
      structure: [
        {
          partKa: "მისალმება",
          purposeKa: "თბილი, პროფესიული დასაწყისი.",
          exampleEn: "Hi everyone,",
        },
        {
          partKa: "სახელი და როლი",
          purposeKa: "თქვი ვინ ხარ და რას აკეთებ.",
          exampleEn: "My name is Davit and I am the new marketing assistant.",
        },
        {
          partKa: "კონტექსტი",
          purposeKa: "დაამატე ცოტა დეტალი.",
          exampleEn: "I will be working closely with the sales team.",
        },
        {
          partKa: "თბილი დასასრული",
          purposeKa: "გახსენი მომავალი კომუნიკაცია.",
          exampleEn: "Feel free to reach out anytime. Best, Davit",
        },
      ],
      examples: [
        {
          en: "I just joined the company this week.",
          ka: "ამ კვირაში შემოვუერთდი კომპანიას.",
          noteKa: "კარგი გზა კონტექსტის დასამატებლად.",
        },
        {
          en: "I will be working with the design team.",
          ka: "ვიმუშავებ დიზაინის გუნდთან ერთად.",
        },
        {
          en: "Feel free to reach out anytime.",
          ka: "თავისუფლად დამიკავშირდით ნებისმიერ დროს.",
          noteKa: "თბილი, ღია დასასრული.",
        },
      ],
    },
    realExample: {
      contextKa: "დავითი ახალი მარკეტინგის ასისტენტია. ის ეცნობა მთელ განყოფილებას.",
      subject: "Introduction — New Marketing Assistant",
      body: "Hi everyone,\n\nMy name is Davit and I am the new marketing assistant. I started this week and I am excited to join the team.\n\nI will be working closely with the sales and content teams. Please feel free to reach out anytime — I would love to get to know everyone.\n\nBest,\nDavit",
      annotationsKa: [
        "subject line მკაფიოა — მაშინვე ჩანს, რომ ეს გაცნობაა.",
        "დავითი ამბობს როლს, დაწყების დროს და რომელ გუნდთან იმუშავებს.",
        "დასასრული ღიაა და თბილი, ხალხს ეპატიჟება დაკავშირებისკენ.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ ახალი თანამშრომელი ხარ და გინდა მთელ განყოფილებას გააცნო თავი. დაწერე გაცნობის წერილი: შენი სახელი, როლი, როდის დაიწყე და თბილი მოწვევა დაკავშირებისთვის.",
      recipientRole: "your department",
      promptKa: "დაწერე 4-6 წინადადება. გახადე ნათელი და თბილი.",
      hintsKa: [
        "ნათლად თქვი შენი როლი — მაგ. 'I am the new accountant'.",
        "დაამატე კონტექსტი — როდის დაიწყე ან ვისთან იმუშავებ.",
        "დაასრულე მოწვევით — 'Feel free to reach out anytime.'",
      ],
    },
    vocabulary: [
      {
        en: "assistant",
        ka: "ასისტენტი / თანაშემწე",
        exampleEn: "I am the new marketing assistant.",
        exampleKa: "მე ვარ ახალი მარკეტინგის ასისტენტი.",
      },
      {
        en: "join",
        ka: "შეერთება / შესვლა (გუნდში)",
        exampleEn: "I am excited to join the team.",
        exampleKa: "მოხარული ვარ, რომ გუნდს ვუერთდები.",
      },
      {
        en: "reach out",
        ka: "დაკავშირება",
        exampleEn: "Feel free to reach out anytime.",
        exampleKa: "თავისუფლად დამიკავშირდით ნებისმიერ დროს.",
      },
      {
        en: "closely",
        ka: "მჭიდროდ",
        exampleEn: "I will work closely with the sales team.",
        exampleKa: "მჭიდროდ ვიმუშავებ გაყიდვების გუნდთან.",
      },
    ],
    readAloudPhrases: [
      "My name is Davit and I am the new marketing assistant.",
      "I started this week and I am excited to join the team.",
      "I will be working closely with the sales and content teams.",
      "Please feel free to reach out anytime.",
    ],
  },

  // ---------------- INTERMEDIATE ----------------
  business_intermediate: {
    emailType: "introduction",
    level: "business_intermediate",
    dailyFocusKa: "დღეს ვისწავლით პროფესიულ გაცნობის წერილს, რომელიც აჩვენებს ვინ ხარ, რას მოიტან გუნდში და ქმნის კარგ პირველ შთაბეჭდილებას.",
    estimatedMinutes: 15,
    warmUp: {
      kind: "spot_mistakes",
      promptKa: "რა აკლია ან რა არის სუსტი ამ გაცნობის წერილში?",
      options: [
        {
          label: "A",
          text: "Hi team,\n\nI'm Ana, the new project manager. I have six years of experience in fintech and I'm looking forward to supporting your upcoming product launch.\n\nI'd love to set up quick chats with each of you over the next week.\n\nBest,\nAna",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi team,\n\nI'm the new project manager. I'm very passionate and hard-working and I will do my best. Looking forward to it.\n\nThanks",
          isBetter: false,
          issuesKa: [
            "არ ამბობს სახელს — ხალხმა არ იცის ვინ წერს.",
            "'passionate and hard-working' ცარიელი კლიშეებია — არ აჩვენებს კონკრეტიკას.",
            "არ აქვს მკაფიო next step ან კონკრეტული გამოცდილება.",
          ],
        },
      ],
      explanationKa:
        "ძლიერი გაცნობა იყენებს კონკრეტიკას (სახელი, წლები, სფერო) კლიშეების ნაცვლად. 'six years in fintech' ბევრად უკეთესია ვიდრე 'very passionate'.",
    },
    learn: {
      titleKa: "პროფესიული გაცნობა, რომელიც რჩება მახსოვრობაში",
      explanationKa:
        "კარგი გაცნობა აკეთებს სამ რამეს: ნათლად გაგაცნობს, აჩვენებს რას მოიტან (კონკრეტული გამოცდილება, არა კლიშეები), და გვთავაზობს მკაფიო next step. მოერიდე ცარიელ ფრაზებს როგორიცაა 'hard-working' — ამის ნაცვლად აჩვენე ფაქტებით.",
      structure: [
        {
          partKa: "მისალმება და სახელი",
          purposeKa: "მაშინვე თქვი ვინ ხარ.",
          exampleEn: "Hi team, I'm Ana, the new project manager.",
        },
        {
          partKa: "შენი ღირებულება",
          purposeKa: "აჩვენე გამოცდილება კონკრეტიკით.",
          exampleEn: "I have six years of experience in fintech.",
        },
        {
          partKa: "კავშირი მათ მუშაობასთან",
          purposeKa: "დააკავშირე შენი როლი მათ მიზნებთან.",
          exampleEn: "I'm looking forward to supporting your product launch.",
        },
        {
          partKa: "მკაფიო next step",
          purposeKa: "შესთავაზე კონკრეტული მოქმედება.",
          exampleEn: "I'd love to set up quick chats with each of you.",
        },
      ],
      examples: [
        {
          en: "I have six years of experience in fintech.",
          ka: "მაქვს ექვსი წლის გამოცდილება ფინტექში.",
          noteKa: "კონკრეტული ფაქტი > ცარიელი კლიშე.",
        },
        {
          en: "I'm looking forward to supporting your product launch.",
          ka: "მოუთმენლად ველი თქვენი პროდუქტის გაშვების მხარდაჭერას.",
          noteKa: "აკავშირებს შენს როლს მათ რეალურ მიზანთან.",
        },
        {
          en: "I'd love to set up quick chats with each of you.",
          ka: "სიამოვნებით მოვაწყობდი მოკლე შეხვედრებს თითოეულ თქვენგანთან.",
          noteKa: "მკაფიო, თავაზიანი next step.",
        },
      ],
    },
    realExample: {
      contextKa: "ანა ახალი პროექტის მენეჯერია ფინტექ კომპანიაში. ის ეცნობა გუნდს, რომელთანაც ერთად იმუშავებს.",
      subject: "Introduction — Ana, New Project Manager",
      body: "Hi team,\n\nI'm Ana, the new project manager joining the product group. I have six years of experience in fintech, most recently leading payment integration projects, and I'm genuinely excited to support your upcoming product launch.\n\nOver my first two weeks, I'd love to set up quick 15-minute chats with each of you to understand your priorities and how I can best help.\n\nThanks, and looking forward to working together.\n\nBest,\nAna",
      annotationsKa: [
        "subject line მკაფიოდ ამბობს ვინ არის და რა როლშია.",
        "'six years in fintech' და 'payment integration' კონკრეტული გამოცდილებაა — არა ცარიელი კლიშე.",
        "სთავაზობს კონკრეტულ next step-ს (15-წუთიანი შეხვედრები) მკაფიო მიზნით.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ ახალ პოზიციაზე გადახვედი და გინდა გააცნო თავი გუნდს, რომელთანაც მჭიდროდ იმუშავებ. დაწერე პროფესიული გაცნობის წერილი: ვინ ხარ, რა კონკრეტული გამოცდილება მოგაქვს, როგორ დაეხმარები მათ და მკაფიო next step.",
      recipientRole: "your new cross-functional team",
      promptKa: "დაწერე 5-7 წინადადება. გამოიყენე კონკრეტიკა კლიშეების ნაცვლად და დაასრულე მკაფიო next step-ით.",
      hintsKa: [
        "სახელი და როლი თქვი პირველ წინადადებაში.",
        "გამოიყენე კონკრეტული ფაქტი — წლები, სფერო, ან კონკრეტული პროექტი.",
        "დაასრულე კონკრეტული შემოთავაზებით — მაგ. მოკლე შეხვედრები.",
        "მოერიდე 'passionate', 'hard-working' ტიპის ცარიელ სიტყვებს.",
      ],
    },
    vocabulary: [
      {
        en: "experience",
        ka: "გამოცდილება",
        exampleEn: "I have six years of experience in fintech.",
        exampleKa: "მაქვს ექვსი წლის გამოცდილება ფინტექში.",
      },
      {
        en: "support",
        ka: "მხარდაჭერა",
        exampleEn: "I'm looking forward to supporting your launch.",
        exampleKa: "მოუთმენლად ველი თქვენი გაშვების მხარდაჭერას.",
      },
      {
        en: "priorities",
        ka: "პრიორიტეტები",
        exampleEn: "I'd like to understand your priorities.",
        exampleKa: "მსურს გავიგო თქვენი პრიორიტეტები.",
      },
      {
        en: "set up",
        ka: "მოწყობა / დანიშვნა",
        exampleEn: "Let's set up a quick chat.",
        exampleKa: "მოდი მოვაწყოთ მოკლე შეხვედრა.",
      },
      {
        en: "looking forward to",
        ka: "მოუთმენლად ლოდინი",
        exampleEn: "I'm looking forward to working together.",
        exampleKa: "მოუთმენლად ველი ერთად მუშაობას.",
      },
    ],
    readAloudPhrases: [
      "I'm Ana, the new project manager joining the product group.",
      "I have six years of experience in fintech.",
      "I'm genuinely excited to support your upcoming product launch.",
      "I'd love to set up quick fifteen-minute chats with each of you.",
    ],
  },

  // ---------------- ADVANCED ----------------
  business_advanced: {
    emailType: "introduction",
    level: "business_advanced",
    dailyFocusKa: "დღეს დავხვეწავთ გაცნობის წერილს ისე, რომ ის იყოს თავდაჯერებული, კონტექსტზე მორგებული და სტრატეგიულად დააყენოს შენი როლი გუნდში.",
    estimatedMinutes: 15,
    warmUp: {
      kind: "spot_mistakes",
      promptKa: "ეს გაცნობა გრამატიკულად სწორია, მაგრამ რა შეიძლება გავაუმჯობესოთ ტონსა და სტრატეგიაში?",
      options: [
        {
          label: "A",
          text: "Hi all,\n\nI'm Luka, stepping in as Head of Operations. I've spent the last decade scaling logistics teams, and I know joining mid-quarter raises questions — so my first priority is listening before proposing any changes.\n\nI'll be reaching out individually this week. In the meantime, my door is open.\n\nBest,\nLuka",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi all,\n\nI'm Luka, the new Head of Operations. I have a lot of experience and I plan to make several improvements to how things currently work here. I look forward to implementing my ideas.\n\nBest,\nLuka",
          isBetter: false,
          issuesKa: [
            "'make several improvements' გუნდამდე ნდობის აშენებამდე — შეიძლება თავდამსხმელად აღიქმებოდეს.",
            "ფოკუსი 'my ideas'-ზეა და არა გუნდის მოსმენაზე — სუსტი სტრატეგია ახალი ლიდერისთვის.",
            "არ აღიარებს, რომ კვარტლის შუაში მოსვლა კითხვებს ბადებს.",
          ],
        },
      ],
      explanationKa:
        "ძლიერი ლიდერის გაცნობა აშენებს ნდობას მოსმენით, არა ცვლილებების დაპირებით. ვარიანტი A აჩვენებს თავდაჯერებულობას მოკრძალებასთან ერთად — 'listening before proposing'.",
    },
    learn: {
      titleKa: "სტრატეგიული გაცნობა: ტონი, კონტექსტი და პოზიციონირება",
      explanationKa:
        "მაღალ დონეზე გაცნობა მხოლოდ ფაქტების ჩამოთვლა აღარ არის — ის სტრატეგიული ინსტრუმენტია. ის უნდა აჩვენებდეს თავდაჯერებულობას ისე, რომ არ ჩანდე ამპარტავანი, აღიარებდეს კონტექსტს (მაგ. რთულ პერიოდში მოსვლა) და სწორად აყენებდეს შენს როლს. ტონი ისეთივე მნიშვნელოვანია, როგორც შინაარსი.",
      structure: [
        {
          partKa: "თავდაჯერებული გახსნა",
          purposeKa: "დაიკავე შენი როლი ბუნებრივი ავტორიტეტით.",
          exampleEn: "I'm Luka, stepping in as Head of Operations.",
        },
        {
          partKa: "კონტექსტის აღიარება",
          purposeKa: "აჩვენე, რომ გესმის სიტუაცია.",
          exampleEn: "I know joining mid-quarter raises questions.",
        },
        {
          partKa: "სტრატეგიული პოზიციონირება",
          purposeKa: "დააყენე შენი მიდგომა ნდობის ასაშენებლად.",
          exampleEn: "My first priority is listening before proposing any changes.",
        },
        {
          partKa: "ღია, მაგრამ მკაფიო დასასრული",
          purposeKa: "დატოვე ხელმისაწვდომობის შეგრძნება.",
          exampleEn: "I'll be reaching out individually this week. My door is open.",
        },
      ],
      examples: [
        {
          en: "I know joining mid-quarter raises questions.",
          ka: "ვიცი, რომ კვარტლის შუაში მოსვლა კითხვებს ბადებს.",
          noteKa: "კონტექსტის აღიარება ნდობას აშენებს.",
        },
        {
          en: "My first priority is listening before proposing any changes.",
          ka: "ჩემი პირველი პრიორიტეტია მოსმენა, სანამ რაიმე ცვლილებას შევთავაზებ.",
          noteKa: "სტრატეგიული ტონი — მოკრძალება ძალასთან ერთად.",
        },
        {
          en: "My door is open.",
          ka: "ჩემი კარი ღიაა.",
          noteKa: "მოკლე, ძლიერი, ხელმისაწვდომი დასასრული.",
        },
      ],
    },
    realExample: {
      contextKa: "ლუკა ახალი ოპერაციების ხელმძღვანელია. ის შემოდის კვარტლის შუაში და სჭირდება გუნდის ნდობის მოპოვება ცვლილებების შეთავაზებამდე.",
      subject: "Hello — Luka, joining as Head of Operations",
      body: "Hi all,\n\nI'm Luka, stepping in as your new Head of Operations. Over the past decade I've focused on scaling logistics and operations teams through periods of fast growth, most recently at a regional e-commerce company.\n\nI'm aware that a leadership change mid-quarter naturally raises questions, so I want to be clear about my approach: my first priority is to listen and understand how things work today before suggesting any changes. Your insight into what's working — and what isn't — will shape everything I do here.\n\nI'll be reaching out to each of you individually over the next week for a short conversation. In the meantime, my door is genuinely open.\n\nLooking forward to working together.\n\nBest,\nLuka",
      annotationsKa: [
        "'stepping in as' თავდაჯერებულია, მაგრამ არა ამპარტავანი.",
        "ღიად აღიარებს კონტექსტს — კვარტლის შუაში ცვლილებას — რაც ნდობას ზრდის.",
        "სტრატეგიულად აყენებს თავს მსმენელად, არა მაშინვე რეფორმატორად.",
        "დასასრული აერთიანებს ხელმისაწვდომობას და მკაფიო next step-ს.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ ხელმძღვანელ პოზიციაზე შემოდიხარ გუნდში არასტაბილურ ან გარდამავალ პერიოდში (მაგ. რეორგანიზაცია, წინა ლიდერის წასვლა). დაწერე გაცნობის წერილი, რომელიც აჩვენებს თავდაჯერებულობას, აღიარებს კონტექსტს და სტრატეგიულად გაშენებს ნდობას.",
      recipientRole: "the team you will now lead",
      promptKa: "დაწერე 6-9 წინადადება. დააბალანსე ავტორიტეტი და მოკრძალება. აჩვენე, რომ ჯერ მოუსმენ, შემდეგ იმოქმედებ.",
      hintsKa: [
        "გახსენი თავდაჯერებულად, მაგრამ მოერიდე ამპარტავნობას.",
        "აღიარე კონტექსტი — რთული მომენტი, გარდამავალი პერიოდი.",
        "დააყენე თავი მსმენელად ცვლილებების დაპირებამდე.",
        "დაასრულე ხელმისაწვდომობით და კონკრეტული next step-ით.",
      ],
    },
    vocabulary: [
      {
        en: "step in",
        ka: "ჩაბმა / როლის დაკავება",
        exampleEn: "I'm stepping in as Head of Operations.",
        exampleKa: "ვიკავებ ოპერაციების ხელმძღვანელის როლს.",
      },
      {
        en: "scale",
        ka: "მასშტაბირება / გაზრდა",
        exampleEn: "I've focused on scaling operations teams.",
        exampleKa: "ფოკუსირებული ვიყავი ოპერაციების გუნდების მასშტაბირებაზე.",
      },
      {
        en: "raise questions",
        ka: "კითხვების გაჩენა",
        exampleEn: "A leadership change raises questions.",
        exampleKa: "ლიდერის ცვლილება კითხვებს ბადებს.",
      },
      {
        en: "insight",
        ka: "ხედვა / ღრმა გაგება",
        exampleEn: "Your insight will shape my approach.",
        exampleKa: "თქვენი ხედვა ჩამოაყალიბებს ჩემს მიდგომას.",
      },
      {
        en: "priority",
        ka: "პრიორიტეტი",
        exampleEn: "My first priority is to listen.",
        exampleKa: "ჩემი პირველი პრიორიტეტია მოსმენა.",
      },
    ],
    readAloudPhrases: [
      "I'm Luka, stepping in as your new Head of Operations.",
      "I'm aware that a leadership change mid-quarter naturally raises questions.",
      "My first priority is to listen and understand how things work today.",
      "My door is genuinely open.",
    ],
  },
};

// ============================================================
// TOPIC 2: FOLLOW-UP (Follow-up წერილი)
// ============================================================

const followUp: Record<Level, EmailLesson> = {
  // ---------------- BEGINNER ----------------
  business_beginner: {
    emailType: "follow_up",
    level: "business_beginner",
    dailyFocusKa: "დღეს ვისწავლით მარტივი follow-up წერილის დაწერას — თავაზიანად შევახსენოთ წინა იმეილი ან შეხვედრა.",
    estimatedMinutes: 10,
    warmUp: {
      kind: "compare",
      promptKa: "რომელი follow-up არის უფრო თავაზიანი?",
      options: [
        {
          label: "A",
          text: "Hello, I am just following up on my last email. Thank you.",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Why did you not answer my email???",
          isBetter: false,
          issuesKa: [
            "ტონი ბრაზიანი და უხეშია.",
            "სამი კითხვის ნიშანი აგრესიულად ჟღერს.",
          ],
        },
      ],
      explanationKa:
        "Follow-up ყოველთვის თავაზიანი უნდა იყოს. 'just following up' რბილი და პროფესიონალური გზაა შესახსენებლად.",
    },
    learn: {
      titleKa: "მარტივი follow-up სამ ნაბიჯში",
      explanationKa:
        "Follow-up წერილი თავაზიანად ახსენებს ხალხს წინა იმეილს ან თხოვნას. იყავი მოკლე და მეგობრული.",
      structure: [
        {
          partKa: "მისალმება",
          purposeKa: "დაიწყე თბილად.",
          exampleEn: "Hello,",
        },
        {
          partKa: "შეხსენება",
          purposeKa: "ახსენე წინა იმეილი.",
          exampleEn: "I am following up on my last email.",
        },
        {
          partKa: "თავაზიანი თხოვნა",
          purposeKa: "სთხოვე პასუხი მშვიდად.",
          exampleEn: "Please let me know. Thank you.",
        },
      ],
      examples: [
        {
          en: "I am following up on my email.",
          ka: "ვამოწმებ ჩემს იმეილს.",
          noteKa: "მარტივი გზა შესახსენებლად.",
        },
        {
          en: "Did you have time to look at it?",
          ka: "მოასწარით მისი ნახვა?",
        },
        {
          en: "Thank you for your time.",
          ka: "გმადლობთ თქვენი დროისთვის.",
        },
      ],
    },
    realExample: {
      contextKa: "ნინომ კვირის წინ იმეილი გააგზავნა. პასუხი არ მიუღია. ის თავაზიანად ამოწმებს.",
      subject: "Following up",
      body: "Hello,\n\nI am following up on my last email from last week. Did you have time to look at it?\n\nPlease let me know. Thank you.\n\nBest,\nNino",
      annotationsKa: [
        "ნინო თავაზიანად ახსენებს, არ ბრაზობს.",
        "მოკლე და მკაფიო კითხვა სვამს.",
        "მადლობით ამთავრებს.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ კოლეგას იმეილი გაუგზავნე რამდენიმე დღის წინ, მაგრამ პასუხი ჯერ არ მიგიღია. დაწერე მოკლე, თავაზიანი follow-up წერილი და სთხოვე პასუხი.",
      recipientRole: "a colleague",
      promptKa: "დაწერე 3-4 მოკლე წინადადება. იყავი თავაზიანი და მშვიდი.",
      hintsKa: [
        "გამოიყენე 'I am following up on...'.",
        "სთხოვე თავაზიანად — 'Please let me know'.",
        "დაამატე 'Thank you' ბოლოს.",
      ],
    },
    vocabulary: [
      {
        en: "follow up",
        ka: "გადამოწმება / შეხსენება",
        exampleEn: "I am following up on my email.",
        exampleKa: "ვამოწმებ ჩემს იმეილს.",
      },
      {
        en: "reply",
        ka: "პასუხი",
        exampleEn: "Please reply when you can.",
        exampleKa: "გთხოვ უპასუხე, როცა შეგიძლია.",
      },
      {
        en: "remind",
        ka: "შეხსენება",
        exampleEn: "I want to remind you about the meeting.",
        exampleKa: "მინდა შეგახსენო შეხვედრის შესახებ.",
      },
    ],
    readAloudPhrases: [
      "I am following up on my last email.",
      "Did you have time to look at it?",
      "Please let me know.",
      "Thank you for your time.",
    ],
  },

  // ---------------- ELEMENTARY ----------------
  business_elementary: {
    emailType: "follow_up",
    level: "business_elementary",
    dailyFocusKa: "დღეს ვისწავლით follow-up წერილს, რომელიც ახსენებს კონტექსტს და სთავაზობს მკაფიო შემდეგ ნაბიჯს.",
    estimatedMinutes: 12,
    warmUp: {
      kind: "compare",
      promptKa: "რომელი follow-up არის უფრო ეფექტური?",
      options: [
        {
          label: "A",
          text: "Hi, just following up on the proposal I sent on Monday. Would Thursday work for a quick call?",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi, any news?",
          isBetter: false,
          issuesKa: [
            "ძალიან ბუნდოვანია — არ ახსენებს რაზეა საუბარი.",
            "არ სთავაზობს კონკრეტულ შემდეგ ნაბიჯს.",
          ],
        },
      ],
      explanationKa:
        "კარგი follow-up ახსენებს კონტექსტს ('the proposal I sent on Monday') და სთავაზობს კონკრეტიკას ('Thursday for a call').",
    },
    learn: {
      titleKa: "Follow-up კონტექსტითა და შემდეგი ნაბიჯით",
      explanationKa:
        "ძლიერი follow-up ახსენებს ზუსტად რაზე წერ (კონტექსტი), თავაზიანად ამოწმებს და სთავაზობს მკაფიო შემდეგ ნაბიჯს — მაგ. ზარს ან ვადას.",
      structure: [
        {
          partKa: "მისალმება",
          purposeKa: "თბილი დასაწყისი.",
          exampleEn: "Hi Mariam,",
        },
        {
          partKa: "კონტექსტი",
          purposeKa: "ახსენე რას ეხება.",
          exampleEn: "I'm following up on the proposal I sent on Monday.",
        },
        {
          partKa: "თავაზიანი შემოწმება",
          purposeKa: "ჰკითხე სტატუსი.",
          exampleEn: "I wanted to check if you had any questions.",
        },
        {
          partKa: "მკაფიო შემდეგი ნაბიჯი",
          purposeKa: "შესთავაზე კონკრეტული მოქმედება.",
          exampleEn: "Would Thursday work for a quick call?",
        },
      ],
      examples: [
        {
          en: "I'm following up on the proposal I sent on Monday.",
          ka: "ვამოწმებ წინადადებას, რომელიც ორშაბათს გამოგიგზავნე.",
          noteKa: "კონტექსტი ეხმარება მკითხველს გაიხსენოს.",
        },
        {
          en: "I wanted to check if you had any questions.",
          ka: "მინდოდა გადამემოწმებინა, თუ გქონდათ შეკითხვები.",
        },
        {
          en: "Would Thursday work for a quick call?",
          ka: "ხუთშაბათი მოგწონთ მოკლე ზარისთვის?",
          noteKa: "კონკრეტული შემდეგი ნაბიჯი.",
        },
      ],
    },
    realExample: {
      contextKa: "დავითმა წინადადება გაუგზავნა კლიენტს ორშაბათს. სამი დღე გავიდა. ის თავაზიანად ამოწმებს.",
      subject: "Following up on Monday's proposal",
      body: "Hi Mariam,\n\nI'm following up on the proposal I sent on Monday. I wanted to check if you had any questions or needed more details.\n\nWould Thursday work for a quick 15-minute call to discuss it?\n\nThanks,\nDavit",
      annotationsKa: [
        "subject line ახსენებს ზუსტად რას ეხება.",
        "დავითი ახსენებს კონტექსტს და სთავაზობს დახმარებას.",
        "სთავაზობს კონკრეტულ შემდეგ ნაბიჯს — ხუთშაბათის ზარს.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ კლიენტს ან კოლეგას რამდენიმე დღის წინ გაუგზავნე მნიშვნელოვანი იმეილი (წინადადება, დოკუმენტი ან თხოვნა). პასუხი არ მიგიღია. დაწერე follow-up: ახსენე კონტექსტი, თავაზიანად შეამოწმე და შესთავაზე შემდეგი ნაბიჯი.",
      recipientRole: "a client",
      promptKa: "დაწერე 4-6 წინადადება. ახსენე კონტექსტი და შესთავაზე კონკრეტული შემდეგი ნაბიჯი.",
      hintsKa: [
        "ახსენე ზუსტად რას ეხება — 'the proposal I sent on Monday'.",
        "თავაზიანად შეამოწმე — 'I wanted to check...'.",
        "შესთავაზე შემდეგი ნაბიჯი — ზარი ან ვადა.",
      ],
    },
    vocabulary: [
      {
        en: "proposal",
        ka: "წინადადება",
        exampleEn: "I'm following up on the proposal.",
        exampleKa: "ვამოწმებ წინადადებას.",
      },
      {
        en: "check",
        ka: "შემოწმება",
        exampleEn: "I wanted to check if you had questions.",
        exampleKa: "მინდოდა შემემოწმებინა, თუ გქონდათ შეკითხვები.",
      },
      {
        en: "details",
        ka: "დეტალები",
        exampleEn: "Let me know if you need more details.",
        exampleKa: "მაცნობეთ, თუ მეტი დეტალი გჭირდებათ.",
      },
      {
        en: "discuss",
        ka: "განხილვა",
        exampleEn: "Let's discuss it on a call.",
        exampleKa: "მოდი ზარზე განვიხილოთ.",
      },
    ],
    readAloudPhrases: [
      "I'm following up on the proposal I sent on Monday.",
      "I wanted to check if you had any questions.",
      "Would Thursday work for a quick fifteen-minute call?",
      "Let me know if you need more details.",
    ],
  },

  // ---------------- INTERMEDIATE ----------------
  business_intermediate: {
    emailType: "follow_up",
    level: "business_intermediate",
    dailyFocusKa: "დღეს ვისწავლით პროფესიონალურ follow-up-ს, რომელიც თავაზიანად დაჟინებულია — ახსენებს ღირებულებას და ინარჩუნებს მომენტუმს.",
    estimatedMinutes: 15,
    warmUp: {
      kind: "spot_mistakes",
      promptKa: "ეს follow-up სუსტია — რა აკლია?",
      options: [
        {
          label: "A",
          text: "Hi Tom,\n\nFollowing up on our conversation last Tuesday about the Q3 campaign. You mentioned the timeline was your main concern, so I've put together a revised schedule that should address it.\n\nCould we find 20 minutes this week to walk through it?\n\nBest,\nElene",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi Tom,\n\nJust checking in again. Still waiting to hear back from you. Please respond when you get a chance.\n\nThanks,\nElene",
          isBetter: false,
          issuesKa: [
            "არ ახსენებს კონკრეტულ კონტექსტს — რაზე იყო საუბარი.",
            "არ მოაქვს ახალი ღირებულება — უბრალოდ პასუხს ითხოვს.",
            "'still waiting' ოდნავ უკმაყოფილოდ ჟღერს.",
          ],
        },
      ],
      explanationKa:
        "ძლიერი follow-up მოაქვს ახალ ღირებულებას — A ახსენებს კონკრეტულ საზრუნავს (timeline) და სთავაზობს გადაწყვეტას, არა მხოლოდ შეხსენებას.",
    },
    learn: {
      titleKa: "Follow-up, რომელიც ღირებულებას მატებს",
      explanationKa:
        "კარგი პროფესიონალური follow-up არ არის უბრალო შეხსენება — ის ამატებს ღირებულებას. ახსენე კონკრეტული კონტექსტი, მიაბი ის მათ საზრუნავს ან ინტერესს, და შესთავაზე მკაფიო, მცირე შემდეგი ნაბიჯი. ეს ინარჩუნებს მომენტუმს ზეწოლის გარეშე.",
      structure: [
        {
          partKa: "კონტექსტის შეხსენება",
          purposeKa: "ზუსტად ახსენე რას ეხება.",
          exampleEn: "Following up on our conversation last Tuesday about the Q3 campaign.",
        },
        {
          partKa: "ღირებულების დამატება",
          purposeKa: "მიაბი მათ საზრუნავს.",
          exampleEn: "You mentioned the timeline was your concern, so I've revised the schedule.",
        },
        {
          partKa: "მცირე, მკაფიო ნაბიჯი",
          purposeKa: "გააადვილე დათანხმება.",
          exampleEn: "Could we find 20 minutes this week to walk through it?",
        },
        {
          partKa: "თავდაჯერებული დასასრული",
          purposeKa: "დაასრულე პროფესიონალურად.",
          exampleEn: "Best, Elene",
        },
      ],
      examples: [
        {
          en: "You mentioned the timeline was your main concern.",
          ka: "თქვენ აღნიშნეთ, რომ ვადები იყო თქვენი მთავარი საზრუნავი.",
          noteKa: "მათი სიტყვების ხსენება აჩვენებს, რომ უსმენდი.",
        },
        {
          en: "I've put together a revised schedule that should address it.",
          ka: "მოვამზადე გადახედილი გრაფიკი, რომელიც ამას მოაგვარებს.",
          noteKa: "ღირებულების დამატება — არა მხოლოდ შეხსენება.",
        },
        {
          en: "Could we find 20 minutes this week to walk through it?",
          ka: "შეგვიძლია ამ კვირაში 20 წუთი მოვძებნოთ მის განსახილველად?",
          noteKa: "მცირე, კონკრეტული ნაბიჯი — ადვილი დასათანხმებელი.",
        },
      ],
    },
    realExample: {
      contextKa: "ელენემ კოლეგას ერთი კვირის წინ ესაუბრა Q3 კამპანიაზე. პასუხი არ მიუღია, ამიტომ ის გზავნის follow-up-ს, რომელშიც ახალ გადაწყვეტას სთავაზობს.",
      subject: "Revised timeline for the Q3 campaign",
      body: "Hi Tom,\n\nFollowing up on our conversation last Tuesday about the Q3 campaign. You mentioned the timeline was your main concern, so I've put together a revised schedule that pulls the launch forward by a week without overloading the team.\n\nCould we find 20 minutes this week to walk through it? I'm happy to work around your calendar.\n\nBest,\nElene",
      annotationsKa: [
        "subject line მაშინვე აჩვენებს ახალ ღირებულებას — 'revised timeline'.",
        "ახსენებს კონკრეტულ საუბარს და მათ ნათქვამ საზრუნავს.",
        "მოაქვს გადაწყვეტა და სთავაზობს მცირე, მოქნილ შემდეგ ნაბიჯს.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ ერთი კვირის წინ ესაუბრე ან მიწერე ვინმეს მნიშვნელოვან საკითხზე (პროექტი, წინადადება, თანამშრომლობა) და პასუხი არ მიგიღია. დაწერე follow-up, რომელიც ახსენებს კონტექსტს, ამატებს ღირებულებას (ახალი ინფორმაცია ან გადაწყვეტა) და სთავაზობს მცირე შემდეგ ნაბიჯს.",
      recipientRole: "a colleague or client",
      promptKa: "დაწერე 5-7 წინადადება. დაამატე ღირებულება — არა მხოლოდ შეხსენება.",
      hintsKa: [
        "ახსენე კონკრეტული საუბარი ან იმეილი.",
        "მიაბი ის მათ საზრუნავს ან ინტერესს.",
        "შესთავაზე მცირე, ადვილად დასათანხმებელი ნაბიჯი.",
        "მოერიდე 'still waiting' ტიპის უკმაყოფილო ტონს.",
      ],
    },
    vocabulary: [
      {
        en: "concern",
        ka: "საზრუნავი / შეშფოთება",
        exampleEn: "You mentioned the timeline was your concern.",
        exampleKa: "თქვენ აღნიშნეთ, რომ ვადები იყო თქვენი საზრუნავი.",
      },
      {
        en: "revised",
        ka: "გადახედილი / შესწორებული",
        exampleEn: "Here is the revised schedule.",
        exampleKa: "აი გადახედილი გრაფიკი.",
      },
      {
        en: "address",
        ka: "მოგვარება / პასუხის გაცემა",
        exampleEn: "This should address your concern.",
        exampleKa: "ეს თქვენს საზრუნავს მოაგვარებს.",
      },
      {
        en: "walk through",
        ka: "დეტალურად განხილვა",
        exampleEn: "Let's walk through it together.",
        exampleKa: "მოდი ერთად დეტალურად განვიხილოთ.",
      },
      {
        en: "work around",
        ka: "მორგება",
        exampleEn: "I'm happy to work around your calendar.",
        exampleKa: "სიამოვნებით მოვერგები თქვენს გრაფიკს.",
      },
    ],
    readAloudPhrases: [
      "Following up on our conversation last Tuesday about the Q3 campaign.",
      "You mentioned the timeline was your main concern.",
      "I've put together a revised schedule that should address it.",
      "Could we find twenty minutes this week to walk through it?",
    ],
  },

  // ---------------- ADVANCED ----------------
  business_advanced: {
    emailType: "follow_up",
    level: "business_advanced",
    dailyFocusKa: "დღეს დავხვეწავთ follow-up-ს, რომელიც ინარჩუნებს მომენტუმს, კითხავს სიჩუმეს დაუშვებლად და სტრატეგიულად ხსნის გზას წინ.",
    estimatedMinutes: 15,
    warmUp: {
      kind: "spot_mistakes",
      promptKa: "ეს follow-up კარგია, მაგრამ რა შეიძლება უფრო სტრატეგიული გავხადოთ?",
      options: [
        {
          label: "A",
          text: "Hi Sarah,\n\nI know things get busy, so I'll keep this brief. We're still keen to move forward on the partnership, but I also don't want to keep something on your plate if priorities have shifted.\n\nIf it's still of interest, I'm happy to send a short scope to make the next step easy. If the timing isn't right, just let me know and I'll follow up next quarter.\n\nBest,\nGiorgi",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi Sarah,\n\nI've emailed a few times now about the partnership and haven't heard back. I'd really appreciate a response so I know where we stand.\n\nBest,\nGiorgi",
          isBetter: false,
          issuesKa: [
            "ხაზს უსვამს საკუთარ იმედგაცრუებას ('emailed a few times').",
            "აყენებს მათ თავდაცვით პოზიციაში, ნაცვლად გზის გახსნისა.",
            "არ სთავაზობს მარტივ გამოსავალს ან გრაცეფულ alternative-ს.",
          ],
        },
      ],
      explanationKa:
        "მაღალი დონის follow-up აძლევს მიმღებს ღირსეულ გამოსავალს. A სთავაზობს ორ მკაფიო გზას ('still interested' ან 'not the right time') და ხსნის ზეწოლას, რაც პასუხის ალბათობას ზრდის.",
    },
    learn: {
      titleKa: "სტრატეგიული follow-up: მომენტუმი ზეწოლის გარეშე",
      explanationKa:
        "მაღალ დონეზე follow-up დახვეწილი ბალანსია — ინარჩუნებ მომენტუმს, მაგრამ არ ახდენ ზეწოლას. საუკეთესო ტექნიკაა მიეცი მიმღებს ღირსეული გამოსავალი: გახსენი ორი გზა (კვლავ დაინტერესება ან თავაზიანი გადადება), რათა პასუხის გაცემა ადვილი გახდეს. სიჩუმე ხშირად ნიშნავს დაკავებულობას, არა უარს — ენა შესაბამისად მოარგე.",
      structure: [
        {
          partKa: "მოკლე, თავდაჯერებული გახსნა",
          purposeKa: "აჩვენე პატივისცემა მათი დროისადმი.",
          exampleEn: "I know things get busy, so I'll keep this brief.",
        },
        {
          partKa: "ინტერესის დადასტურება + ზეწოლის მოხსნა",
          purposeKa: "აჩვენე მოქნილობა.",
          exampleEn: "We're still keen to move forward, but I don't want to keep something on your plate if priorities have shifted.",
        },
        {
          partKa: "ორი ღირსეული გზა",
          purposeKa: "გააადვილე ნებისმიერი პასუხი.",
          exampleEn: "If it's still of interest, I'll send a short scope. If not, just let me know.",
        },
        {
          partKa: "მსუბუქი დასასრული",
          purposeKa: "დატოვე კარი ღია.",
          exampleEn: "Either way, I'll follow up next quarter.",
        },
      ],
      examples: [
        {
          en: "I'll keep this brief.",
          ka: "მოკლედ ვიქნები.",
          noteKa: "პატივისცემა მათი დროისადმი — აყალიბებს კარგ ტონს.",
        },
        {
          en: "I don't want to keep something on your plate if priorities have shifted.",
          ka: "არ მინდა რამე დაგრჩეთ გასაკეთებელი, თუ პრიორიტეტები შეიცვალა.",
          noteKa: "ზეწოლის მოხსნა — აძლევს მათ თავისუფლებას.",
        },
        {
          en: "If the timing isn't right, just let me know.",
          ka: "თუ დრო არ არის შესაფერისი, უბრალოდ მაცნობეთ.",
          noteKa: "ღირსეული გამოსავალი — პასუხი ადვილი ხდება.",
        },
      ],
    },
    realExample: {
      contextKa: "გიორგიმ რამდენჯერმე მისწერა პოტენციურ პარტნიორს, მაგრამ პასუხი არ მიუღია. ის გზავნის სტრატეგიულ follow-up-ს, რომელიც ინარჩუნებს ურთიერთობას ზეწოლის გარეშე.",
      subject: "Quick check on the partnership — no pressure",
      body: "Hi Sarah,\n\nI know things get busy, so I'll keep this brief. We're still genuinely keen to move forward on the partnership, but I also don't want to keep something on your plate if priorities have shifted on your end.\n\nIf it's still of interest, I'm happy to send over a short one-page scope so the next step is easy to say yes to. If the timing isn't right just now, no problem at all — let me know and I'll check back next quarter.\n\nEither way, thanks for considering it.\n\nBest,\nGiorgi",
      annotationsKa: [
        "subject line თავადვე ხსნის ზეწოლას — 'no pressure'.",
        "აღიარებს მათ დაკავებულობას და სთავაზობს მოქნილობას.",
        "ხსნის ორ ღირსეულ გზას, რაც პასუხს ბუნებრივსა და ადვილს ხდის.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ რამდენჯერმე დაუკავშირდი მნიშვნელოვან კონტაქტს (პოტენციური პარტნიორი, კლიენტი ან დამსაქმებელი), მაგრამ პასუხი არ მიგიღია. დაწერე სტრატეგიული follow-up, რომელიც ინარჩუნებს ურთიერთობას, ხსნის ზეწოლას და სთავაზობს ღირსეულ გამოსავალს ორივე მხარისთვის.",
      recipientRole: "an unresponsive prospect or partner",
      promptKa: "დაწერე 6-9 წინადადება. შეინარჩუნე ღირსება და მოქნილობა — გახსენი მკაფიო გზები წინ.",
      hintsKa: [
        "აღიარე მათი დაკავებულობა და პატივი ეცი მათ დროს.",
        "დაადასტურე ინტერესი, მაგრამ მოხსენი ზეწოლა.",
        "გახსენი ორი ღირსეული გზა — დაინტერესება ან თავაზიანი გადადება.",
        "მოერიდე საკუთარი იმედგაცრუების ხაზგასმას.",
      ],
    },
    vocabulary: [
      {
        en: "keen",
        ka: "დაინტერესებული / მსურველი",
        exampleEn: "We're still keen to move forward.",
        exampleKa: "კვლავ გვსურს წინ წავიდეთ.",
      },
      {
        en: "priorities have shifted",
        ka: "პრიორიტეტები შეიცვალა",
        exampleEn: "I understand if priorities have shifted.",
        exampleKa: "მესმის, თუ პრიორიტეტები შეიცვალა.",
      },
      {
        en: "scope",
        ka: "სამუშაოს ფარგლები / აღწერა",
        exampleEn: "I'll send a short scope.",
        exampleKa: "მოკლე აღწერას გამოგიგზავნით.",
      },
      {
        en: "on your plate",
        ka: "გასაკეთებელი / დატვირთვა",
        exampleEn: "I don't want to keep this on your plate.",
        exampleKa: "არ მინდა ეს თქვენთვის ტვირთად დარჩეს.",
      },
      {
        en: "check back",
        ka: "ხელახლა დაკავშირება",
        exampleEn: "I'll check back next quarter.",
        exampleKa: "მომავალ კვარტალში ხელახლა დაგიკავშირდებით.",
      },
    ],
    readAloudPhrases: [
      "I know things get busy, so I'll keep this brief.",
      "We're still genuinely keen to move forward on the partnership.",
      "I don't want to keep something on your plate if priorities have shifted.",
      "If the timing isn't right just now, no problem at all.",
    ],
  },
};

// ============================================================
// MASTER REGISTRY
// ============================================================
// As more topics are added, register them here keyed by curriculum key.

export const EMAIL_LESSONS: Record<string, Record<Level, EmailLesson>> = {
  introduction,
  follow_up: followUp,
  // request,
  // update,
  // complaint,
  // negotiation,
  // closing,
};

/**
 * Fetch a pre-made lesson by topic key + level.
 * Falls back to intermediate if the exact level isn't found,
 * and returns null if the topic isn't built yet (caller can then
 * fall back to live AI generation for not-yet-written topics).
 */
export function getEmailLesson(topicKey: string, level: Level): EmailLesson | null {
  const topic = EMAIL_LESSONS[topicKey];
  if (!topic) return null;
  return topic[level] ?? topic["business_intermediate"] ?? null;
}