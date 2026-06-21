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
// MASTER REGISTRY
// ============================================================
// As more topics are added, register them here keyed by curriculum key.

export const EMAIL_LESSONS: Record<string, Record<Level, EmailLesson>> = {
  introduction,
  // follow_up,    (coming next)
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
