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
// TOPIC 3: REQUEST (მოთხოვნის წერილი)
// ============================================================

const request: Record<Level, EmailLesson> = {
  // ---------------- BEGINNER ----------------
  business_beginner: {
    emailType: "request",
    level: "business_beginner",
    dailyFocusKa: "დღეს ვისწავლით მარტივი, თავაზიანი მოთხოვნის დაწერას — რას ვთხოვთ და თავაზიანად.",
    estimatedMinutes: 10,
    warmUp: {
      kind: "compare",
      promptKa: "რომელი მოთხოვნა უფრო თავაზიანია?",
      options: [
        {
          label: "A",
          text: "Could you please send me the file?",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Send me the file.",
          isBetter: false,
          issuesKa: [
            "ჟღერს როგორც ბრძანება, არა თხოვნა.",
            "აკლია თავაზიანი სიტყვები — 'could you', 'please'.",
          ],
        },
      ],
      explanationKa:
        "'Could you please...' თხოვნას თავაზიანს ხდის. სამუშაო იმეილში ყოველთვის ვამბობთ 'please'.",
    },
    learn: {
      titleKa: "თავაზიანი მოთხოვნის სამი ნაბიჯი",
      explanationKa:
        "მარტივი მოთხოვნა ამბობს რა გჭირდება თავაზიანად. გამოიყენე 'Could you' და 'please' და თქვი მადლობა.",
      structure: [
        {
          partKa: "მისალმება",
          purposeKa: "დაიწყე თბილად.",
          exampleEn: "Hello,",
        },
        {
          partKa: "თავაზიანი მოთხოვნა",
          purposeKa: "თქვი რა გჭირდება.",
          exampleEn: "Could you please send me the report?",
        },
        {
          partKa: "მადლობა",
          purposeKa: "დაასრულე თავაზიანად.",
          exampleEn: "Thank you very much.",
        },
      ],
      examples: [
        {
          en: "Could you please help me?",
          ka: "შეგიძლიათ დამეხმაროთ?",
          noteKa: "'Could you please' — თავაზიანი დასაწყისი.",
        },
        {
          en: "Can you send it today?",
          ka: "შეგიძლიათ დღეს გამომიგზავნოთ?",
        },
        {
          en: "Thank you for your help.",
          ka: "გმადლობთ დახმარებისთვის.",
        },
      ],
    },
    realExample: {
      contextKa: "ნინოს სჭირდება ანგარიში კოლეგისგან. ის თავაზიანად ითხოვს.",
      subject: "Request for the report",
      body: "Hello,\n\nCould you please send me the sales report? I need it for the meeting tomorrow.\n\nThank you very much.\n\nBest,\nNino",
      annotationsKa: [
        "ნინო იყენებს 'Could you please' — თავაზიანია.",
        "ამბობს რატომ სჭირდება (შეხვედრისთვის).",
        "ამთავრებს მადლობით.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ გჭირდება რაღაც კოლეგისგან — მაგალითად დოკუმენტი, ინფორმაცია ან დახმარება. დაწერე მოკლე, თავაზიანი მოთხოვნის წერილი.",
      recipientRole: "a colleague",
      promptKa: "დაწერე 3-4 წინადადება. გამოიყენე 'Could you please' და თქვი მადლობა.",
      hintsKa: [
        "დაიწყე 'Hello,'-თი.",
        "გამოიყენე 'Could you please...'.",
        "დაასრულე 'Thank you'-თი.",
      ],
    },
    vocabulary: [
      {
        en: "request",
        ka: "მოთხოვნა / თხოვნა",
        exampleEn: "I have a small request.",
        exampleKa: "მე მაქვს პატარა თხოვნა.",
      },
      {
        en: "could you",
        ka: "შეგიძლიათ (თავაზიანი)",
        exampleEn: "Could you help me, please?",
        exampleKa: "შეგიძლიათ დამეხმაროთ?",
      },
      {
        en: "send",
        ka: "გაგზავნა",
        exampleEn: "Could you send me the file?",
        exampleKa: "შეგიძლიათ ფაილი გამომიგზავნოთ?",
      },
    ],
    readAloudPhrases: [
      "Could you please send me the sales report?",
      "I need it for the meeting tomorrow.",
      "Thank you very much.",
      "Could you help me, please?",
    ],
  },

  // ---------------- ELEMENTARY ----------------
  business_elementary: {
    emailType: "request",
    level: "business_elementary",
    dailyFocusKa: "დღეს ვისწავლით მკაფიო მოთხოვნას — რა გვჭირდება, რატომ და როდის, თავაზიანი ტონით.",
    estimatedMinutes: 12,
    warmUp: {
      kind: "compare",
      promptKa: "რომელი მოთხოვნა უფრო მკაფიოა?",
      options: [
        {
          label: "A",
          text: "Could you send me the budget file by Friday? I need it to finish the report.",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "I need the file soon please.",
          isBetter: false,
          issuesKa: [
            "'the file' ბუნდოვანია — რომელი ფაილი?",
            "'soon' არ არის კონკრეტული ვადა.",
          ],
        },
      ],
      explanationKa:
        "მკაფიო მოთხოვნა ამბობს ზუსტად რა (budget file), როდის (by Friday) და რატომ (to finish the report).",
    },
    learn: {
      titleKa: "მკაფიო მოთხოვნა: რა, როდის, რატომ",
      explanationKa:
        "კარგი მოთხოვნა კონკრეტულია. თქვი ზუსტად რა გჭირდება, როდის (ვადა) და მოკლედ რატომ. ეს ეხმარება მიმღებს სწრაფად და სწორად დაგეხმაროს.",
      structure: [
        {
          partKa: "მისალმება",
          purposeKa: "თბილი დასაწყისი.",
          exampleEn: "Hi Nika,",
        },
        {
          partKa: "მკაფიო მოთხოვნა",
          purposeKa: "თქვი ზუსტად რა გჭირდება.",
          exampleEn: "Could you send me the budget file?",
        },
        {
          partKa: "ვადა და მიზეზი",
          purposeKa: "დაამატე როდის და რატომ.",
          exampleEn: "I need it by Friday to finish the report.",
        },
        {
          partKa: "თავაზიანი დასასრული",
          purposeKa: "თქვი მადლობა.",
          exampleEn: "Thanks so much for your help.",
        },
      ],
      examples: [
        {
          en: "Could you send me the budget file by Friday?",
          ka: "შეგიძლიათ ბიუჯეტის ფაილი პარასკევამდე გამომიგზავნოთ?",
          noteKa: "კონკრეტული ფაილი + კონკრეტული ვადა.",
        },
        {
          en: "I need it to finish the report.",
          ka: "მჭირდება ანგარიშის დასასრულებლად.",
          noteKa: "მიზეზი ეხმარება მიმღებს პრიორიტეტის დადგენაში.",
        },
        {
          en: "Please let me know if that works.",
          ka: "გთხოვთ მაცნობოთ, თუ ეს მოგწონთ.",
        },
      ],
    },
    realExample: {
      contextKa: "დავითს ანგარიშის დასასრულებლად ბიუჯეტის ფაილი სჭირდება კოლეგისგან პარასკევამდე.",
      subject: "Budget file needed by Friday",
      body: "Hi Nika,\n\nCould you send me the budget file for Q2? I need it by Friday to finish the quarterly report.\n\nIf you need anything from me to speed it up, just let me know.\n\nThanks so much,\nDavit",
      annotationsKa: [
        "subject line ამბობს ზუსტად რა და როდის.",
        "მოთხოვნა კონკრეტულია — რომელი ფაილი, რა ვადა, რა მიზეზი.",
        "სთავაზობს დახმარებას, რაც თანამშრომლობით ტონს ქმნის.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ გჭირდება კონკრეტული რამ კოლეგისგან ან სხვა განყოფილებისგან გარკვეული ვადით. დაწერე მკაფიო მოთხოვნა: რა გჭირდება, როდის და რატომ.",
      recipientRole: "a colleague in another team",
      promptKa: "დაწერე 4-6 წინადადება. იყავი კონკრეტული რასთან, ვადასთან და მიზეზთან დაკავშირებით.",
      hintsKa: [
        "თქვი ზუსტად რა გჭირდება — არა 'the file', არამედ 'the Q2 budget file'.",
        "დაამატე კონკრეტული ვადა — 'by Friday'.",
        "მოკლედ ახსენი რატომ.",
      ],
    },
    vocabulary: [
      {
        en: "by (a deadline)",
        ka: "(ვადამდე) — მაგ. პარასკევამდე",
        exampleEn: "Could you send it by Friday?",
        exampleKa: "შეგიძლიათ პარასკევამდე გამოგზავნოთ?",
      },
      {
        en: "budget",
        ka: "ბიუჯეტი",
        exampleEn: "I need the budget file.",
        exampleKa: "მჭირდება ბიუჯეტის ფაილი.",
      },
      {
        en: "finish",
        ka: "დასრულება",
        exampleEn: "I need it to finish the report.",
        exampleKa: "მჭირდება ანგარიშის დასასრულებლად.",
      },
      {
        en: "speed up",
        ka: "დაჩქარება",
        exampleEn: "Let me know how I can speed it up.",
        exampleKa: "მაცნობეთ, როგორ დავაჩქარო.",
      },
    ],
    readAloudPhrases: [
      "Could you send me the budget file for Q2?",
      "I need it by Friday to finish the quarterly report.",
      "If you need anything from me to speed it up, just let me know.",
      "Please let me know if that works.",
    ],
  },

  // ---------------- INTERMEDIATE ----------------
  business_intermediate: {
    emailType: "request",
    level: "business_intermediate",
    dailyFocusKa: "დღეს ვისწავლით პროფესიონალურ მოთხოვნას, რომელიც აბალანსებს სიცხადეს, თავაზიანობასა და მიმღების პატივისცემას.",
    estimatedMinutes: 15,
    warmUp: {
      kind: "spot_mistakes",
      promptKa: "ეს მოთხოვნა სუსტია — რა შეიძლება გავაუმჯობესოთ?",
      options: [
        {
          label: "A",
          text: "Hi Lisa,\n\nI'm putting together the client deck for Thursday and I'd really value your input on the pricing section. Would you have 15 minutes before Wednesday to review it? Happy to work around your schedule.\n\nThanks,\nAna",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi Lisa,\n\nI need you to review the pricing section of the deck. Please do it before Wednesday.\n\nThanks,\nAna",
          isBetter: false,
          issuesKa: [
            "'I need you to' + 'Please do it' ჟღერს როგორც ბრძანება.",
            "არ სთავაზობს მოქნილობას ან პატივს არ სცემს მათ დროს.",
            "არ ხსნის რატომ არის მათი წვლილი ღირებული.",
          ],
        },
      ],
      explanationKa:
        "პროფესიონალური მოთხოვნა თხოვს, არ ბრძანებს. A იყენებს 'Would you have...' და სთავაზობს მოქნილობას, რაც პატივს სცემს მიმღების ავტონომიას.",
    },
    learn: {
      titleKa: "მოთხოვნა, რომელსაც ხალხი სიამოვნებით ასრულებს",
      explanationKa:
        "ძლიერი მოთხოვნა აბალანსებს სამ რამეს: სიცხადეს (ზუსტად რა გჭირდება), თავაზიანობას (თხოვნა ბრძანების ნაცვლად) და მიმღების პატივისცემას (მოქნილობა, მათი დროის აღიარება). გამოიყენე 'Would you' და 'I'd value your...' და შესთავაზე მოქნილობა.",
      structure: [
        {
          partKa: "კონტექსტი",
          purposeKa: "ახსენე რატომ წერ.",
          exampleEn: "I'm putting together the client deck for Thursday.",
        },
        {
          partKa: "ღირებულებაზე დაფუძნებული მოთხოვნა",
          purposeKa: "აჩვენე რატომ ღირს მათი წვლილი.",
          exampleEn: "I'd really value your input on the pricing section.",
        },
        {
          partKa: "თავაზიანი, კონკრეტული თხოვნა",
          purposeKa: "მკაფიოდ, მაგრამ რბილად.",
          exampleEn: "Would you have 15 minutes before Wednesday to review it?",
        },
        {
          partKa: "მოქნილობის შეთავაზება",
          purposeKa: "პატივი ეცი მათ დროს.",
          exampleEn: "Happy to work around your schedule.",
        },
      ],
      examples: [
        {
          en: "I'd really value your input on the pricing section.",
          ka: "ნამდვილად დამეხმარებოდა თქვენი აზრი ფასების ნაწილზე.",
          noteKa: "აჩვენებს, რომ მათი წვლილი ღირებულია.",
        },
        {
          en: "Would you have 15 minutes before Wednesday?",
          ka: "ხომ არ დაგეთმობოდათ 15 წუთი ოთხშაბათამდე?",
          noteKa: "თავაზიანი და კონკრეტული — რბილი, მაგრამ მკაფიო.",
        },
        {
          en: "Happy to work around your schedule.",
          ka: "სიამოვნებით მოვერგები თქვენს გრაფიკს.",
          noteKa: "მოქნილობა პატივს სცემს მათ ავტონომიას.",
        },
      ],
    },
    realExample: {
      contextKa: "ანა ამზადებს კლიენტის პრეზენტაციას და სჭირდება კოლეგის ექსპერტიზა ფასების ნაწილზე. ის თავაზიანად, მაგრამ მკაფიოდ ითხოვს.",
      subject: "Quick input on the pricing section?",
      body: "Hi Lisa,\n\nI'm putting together the client deck for Thursday's meeting, and I'd really value your input on the pricing section — you know that account better than anyone.\n\nWould you have about 15 minutes before Wednesday to look it over? I'm happy to work around your schedule, or send it in whatever format is easiest for you.\n\nThanks so much,\nAna",
      annotationsKa: [
        "subject line მოკლე, მკაფიო და თავაზიანია.",
        "აღიარებს მიმღების ექსპერტიზას — 'you know that account better than anyone'.",
        "სთავაზობს მოქნილობას ორ ადგილას, რაც პატივს სცემს მათ დროს.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ გჭირდება კოლეგის ან სხვა გუნდის წევრის დახმარება, დრო ან ექსპერტიზა კონკრეტული პროექტისთვის. დაწერე პროფესიონალური მოთხოვნა, რომელიც არის მკაფიო, თავაზიანი და პატივს სცემს მათ დროს.",
      recipientRole: "a busy colleague whose expertise you need",
      promptKa: "დაწერე 5-7 წინადადება. თხოვე, ნუ ბრძანებ. აღიარე მათი ღირებულება და შესთავაზე მოქნილობა.",
      hintsKa: [
        "დაიწყე მოკლე კონტექსტით — რატომ წერ.",
        "აჩვენე რატომ არის მათი წვლილი ღირებული.",
        "გამოიყენე 'Would you have...' ან 'I'd value...'.",
        "შესთავაზე მოქნილობა — მათი გრაფიკი, ფორმატი.",
      ],
    },
    vocabulary: [
      {
        en: "input",
        ka: "წვლილი / აზრი",
        exampleEn: "I'd value your input on this.",
        exampleKa: "დამეხმარებოდა თქვენი აზრი ამაზე.",
      },
      {
        en: "review",
        ka: "გადახედვა / შემოწმება",
        exampleEn: "Could you review the pricing section?",
        exampleKa: "შეგიძლიათ ფასების ნაწილს გადახედოთ?",
      },
      {
        en: "work around",
        ka: "მორგება",
        exampleEn: "I'm happy to work around your schedule.",
        exampleKa: "სიამოვნებით მოვერგები თქვენს გრაფიკს.",
      },
      {
        en: "look over",
        ka: "თვალის გადავლება",
        exampleEn: "Would you look it over before Friday?",
        exampleKa: "ხომ არ გადახედავდით პარასკევამდე?",
      },
      {
        en: "value",
        ka: "დაფასება",
        exampleEn: "I really value your opinion.",
        exampleKa: "ნამდვილად ვაფასებ თქვენს აზრს.",
      },
    ],
    readAloudPhrases: [
      "I'd really value your input on the pricing section.",
      "Would you have about fifteen minutes before Wednesday to look it over?",
      "I'm happy to work around your schedule.",
      "You know that account better than anyone.",
    ],
  },

  // ---------------- ADVANCED ----------------
  business_advanced: {
    emailType: "request",
    level: "business_advanced",
    dailyFocusKa: "დღეს დავხვეწავთ მოთხოვნას, რომელიც რთულ ან დელიკატურ სიტუაციაშიც კი ინარჩუნებს ავტორიტეტს, თავაზიანობასა და მკაფიოობას.",
    estimatedMinutes: 15,
    warmUp: {
      kind: "spot_mistakes",
      promptKa: "ეს მოთხოვნა დელიკატურ სიტუაციაშია — რა შეიძლება უფრო სტრატეგიული გავხადოთ?",
      options: [
        {
          label: "A",
          text: "Hi Mark,\n\nI know your team is stretched right now, so I want to be upfront: I'm asking for something that isn't small. We need engineering support to hit the client's revised deadline, and without a few days of your team's time, we risk slipping.\n\nCould we talk through what's realistic? I'd rather find a version that works for both teams than drop this on you as a demand.\n\nBest,\nDato",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi Mark,\n\nWe need engineering support to hit the client deadline. Can your team allocate a few days this week? It's quite urgent.\n\nBest,\nDato",
          isBetter: false,
          issuesKa: [
            "არ აღიარებს, რომ მეორე გუნდი უკვე გადატვირთულია.",
            "'It's quite urgent' ზეწოლას ქმნის დიალოგის ნაცვლად.",
            "აყენებს მოთხოვნას როგორც მოცემულობას, არა როგორც სამუშაო საკითხს.",
          ],
        },
      ],
      explanationKa:
        "დელიკატური მოთხოვნა აღიარებს ხარჯს მიმღებისთვის და იწვევს დიალოგს. A ღიად ამბობს 'this isn't small' და სთავაზობს ერთობლივ გადაწყვეტას, რაც ნდობას ინარჩუნებს.",
    },
    learn: {
      titleKa: "მაღალი ფსონის მოთხოვნა: ავტორიტეტი და თანამშრომლობა",
      explanationKa:
        "ზოგი მოთხოვნა დელიკატურია — დიდი თხოვნა, დაძაბული ურთიერთობა, ან შეზღუდული რესურსი. აქ საუკეთესო მიდგომაა გამჭვირვალობა: აღიარე ხარჯი მიმღებისთვის, ჩამოაყალიბე მოთხოვნა ერთობლივ პრობლემად და მოიწვიე დიალოგზე ულტიმატუმის ნაცვლად. ეს ინარჩუნებს როგორც ავტორიტეტს, ისე ურთიერთობას.",
      structure: [
        {
          partKa: "ხარჯის აღიარება",
          purposeKa: "აჩვენე, რომ გესმის მათი მდგომარეობა.",
          exampleEn: "I know your team is stretched right now.",
        },
        {
          partKa: "გამჭვირვალე ჩამოყალიბება",
          purposeKa: "იყავი პირდაპირი მოთხოვნის მასშტაბზე.",
          exampleEn: "I'm asking for something that isn't small.",
        },
        {
          partKa: "მოთხოვნა როგორც ერთობლივი პრობლემა",
          purposeKa: "ჩართე ისინი გადაწყვეტაში.",
          exampleEn: "Could we talk through what's realistic?",
        },
        {
          partKa: "თანამშრომლობითი დასასრული",
          purposeKa: "აჩვენე, რომ ორივე მხარეს ითვალისწინებ.",
          exampleEn: "I'd rather find a version that works for both teams.",
        },
      ],
      examples: [
        {
          en: "I know your team is stretched right now.",
          ka: "ვიცი, რომ თქვენი გუნდი ახლა გადატვირთულია.",
          noteKa: "ხარჯის აღიარება აშენებს ნდობას.",
        },
        {
          en: "I'm asking for something that isn't small.",
          ka: "ვთხოვ რაღაცას, რაც მცირე ნამდვილად არ არის.",
          noteKa: "გამჭვირვალობა — არ ცდილობ თხოვნის შენიღბვას.",
        },
        {
          en: "I'd rather find a version that works for both teams than drop this on you.",
          ka: "მირჩევნია ვიპოვოთ ვარიანტი, რომელიც ორივე გუნდს მოერგება, ვიდრე უბრალოდ დაგაკისროთ ეს.",
          noteKa: "თანამშრომლობა ულტიმატუმის ნაცვლად.",
        },
      ],
    },
    realExample: {
      contextKa: "დათოს სჭირდება სხვა გუნდის რესურსი კლიენტის ვადის დასაცავად, მაგრამ ის გუნდი უკვე გადატვირთულია. ის თხოვს გამჭვირვალედ და თანამშრომლობით.",
      subject: "A big ask on the client deadline — let's find what's realistic",
      body: "Hi Mark,\n\nI know your team is stretched thin right now, so I want to be upfront rather than dress this up: I'm asking for something that isn't small.\n\nThe client moved their deadline forward, and to hit it we'd need a few days of engineering support this sprint. Without it, we're likely to slip — and I'd rather solve that with you than around you.\n\nCould we find time to talk through what's actually realistic? If a few days isn't possible, even a lighter version of support might be enough, and I'm open to trading priorities elsewhere to make room.\n\nBest,\nDato",
      annotationsKa: [
        "subject line თავადვე აყენებს ტონს — გულწრფელი და თანამშრომლობითი.",
        "აღიარებს მეორე გუნდის დატვირთვას და არ ნიღბავს მოთხოვნის მასშტაბს.",
        "სთავაზობს მოქნილობას და გაცვლას, რაც მოთხოვნას ერთობლივ პრობლემად აქცევს.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ გჭირდება მნიშვნელოვანი რესურსი, დრო ან დათმობა ვინმესგან დელიკატურ სიტუაციაში — მაგ. გადატვირთული გუნდი, დაძაბული ურთიერთობა, ან დიდი თხოვნა. დაწერე მოთხოვნა, რომელიც აღიარებს ხარჯს, არის გამჭვირვალე და იწვევს თანამშრომლობაზე.",
      recipientRole: "someone under pressure whose help you critically need",
      promptKa: "დაწერე 6-9 წინადადება. დააბალანსე ავტორიტეტი და თანამშრომლობა. აღიარე ხარჯი და მოიწვიე დიალოგზე.",
      hintsKa: [
        "აღიარე მიმღების მდგომარეობა ან დატვირთვა.",
        "იყავი გამჭვირვალე მოთხოვნის მასშტაბზე.",
        "ჩამოაყალიბე ის ერთობლივ პრობლემად, არა ბრძანებად.",
        "შესთავაზე მოქნილობა ან გაცვლა.",
      ],
    },
    vocabulary: [
      {
        en: "stretched (thin)",
        ka: "გადატვირთული",
        exampleEn: "I know your team is stretched thin.",
        exampleKa: "ვიცი, თქვენი გუნდი გადატვირთულია.",
      },
      {
        en: "upfront",
        ka: "გულწრფელი / პირდაპირი",
        exampleEn: "I want to be upfront with you.",
        exampleKa: "მინდა გულწრფელი ვიყო თქვენთან.",
      },
      {
        en: "slip (a deadline)",
        ka: "ვადის გადაცდენა",
        exampleEn: "Without help, we might slip.",
        exampleKa: "დახმარების გარეშე შეიძლება ვადას გადავცდეთ.",
      },
      {
        en: "realistic",
        ka: "რეალისტური",
        exampleEn: "Let's talk about what's realistic.",
        exampleKa: "მოდი ვისაუბროთ იმაზე, რაც რეალისტურია.",
      },
      {
        en: "trade priorities",
        ka: "პრიორიტეტების გაცვლა",
        exampleEn: "I'm open to trading priorities to make room.",
        exampleKa: "მზად ვარ პრიორიტეტები გავცვალო ადგილის გასათავისუფლებლად.",
      },
    ],
    readAloudPhrases: [
      "I know your team is stretched thin right now, so I want to be upfront.",
      "I'm asking for something that isn't small.",
      "I'd rather solve that with you than around you.",
      "Could we find time to talk through what's actually realistic?",
    ],
  },
};

// ============================================================
// TOPIC 4: UPDATE (სტატუსი და მოხსენება)
// ============================================================

const update: Record<Level, EmailLesson> = {
  // ---------------- BEGINNER ----------------
  business_beginner: {
    emailType: "update",
    level: "business_beginner",
    dailyFocusKa: "დღეს ვისწავლით მარტივი სტატუს-განახლების დაწერას — რა გავაკეთეთ და რა არის შემდეგი.",
    estimatedMinutes: 10,
    warmUp: {
      kind: "compare",
      promptKa: "რომელი განახლება უფრო ნათელია?",
      options: [
        {
          label: "A",
          text: "The report is done. I will send it tomorrow.",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Things are going, almost there I think.",
          isBetter: false,
          issuesKa: [
            "'things are going' ბუნდოვანია — არ ჩანს რა მდგომარეობაა.",
            "'I think' გაურკვევლობას ამატებს.",
          ],
        },
      ],
      explanationKa:
        "კარგი განახლება მკაფიოა. 'The report is done' ბევრად უკეთესია ვიდრე ბუნდოვანი 'almost there'.",
    },
    learn: {
      titleKa: "მარტივი განახლების სამი ნაწილი",
      explanationKa:
        "მარტივი სტატუს-განახლება ამბობს: რა გავაკეთე, სად ვარ ახლა და რა არის შემდეგი. იყავი მოკლე და მკაფიო.",
      structure: [
        {
          partKa: "რა გაკეთდა",
          purposeKa: "თქვი დასრულებული ნაწილი.",
          exampleEn: "I finished the first part.",
        },
        {
          partKa: "ახლანდელი მდგომარეობა",
          purposeKa: "თქვი სად ხარ.",
          exampleEn: "I am now working on the second part.",
        },
        {
          partKa: "შემდეგი ნაბიჯი",
          purposeKa: "თქვი რა იქნება შემდეგ.",
          exampleEn: "I will finish it by Friday.",
        },
      ],
      examples: [
        {
          en: "I finished the report.",
          ka: "დავასრულე ანგარიში.",
          noteKa: "მკაფიოდ ამბობს რა გაკეთდა.",
        },
        {
          en: "I am working on it now.",
          ka: "ახლა ვმუშაობ მასზე.",
        },
        {
          en: "It will be ready by Friday.",
          ka: "მზად იქნება პარასკევამდე.",
        },
      ],
    },
    realExample: {
      contextKa: "ნინო მუშაობს ანგარიშზე. ის უგზავნის მოკლე განახლებას მენეჯერს.",
      subject: "Report update",
      body: "Hello,\n\nHere is a quick update. I finished the first part of the report. I am now working on the numbers.\n\nIt will be ready by Friday.\n\nBest,\nNino",
      annotationsKa: [
        "ნინო ამბობს რა დაასრულა.",
        "ამბობს რაზე მუშაობს ახლა.",
        "აძლევს მკაფიო ვადას.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ მუშაობ დავალებაზე და მენეჯერს სჭირდება იცოდეს სად ხარ. დაწერე მოკლე სტატუს-განახლება: რა გააკეთე, რაზე მუშაობ ახლა და როდის დაასრულებ.",
      recipientRole: "your manager",
      promptKa: "დაწერე 3-4 წინადადება. იყავი მკაფიო რა გააკეთე და რა არის შემდეგი.",
      hintsKa: [
        "თქვი რა დაასრულე — 'I finished...'.",
        "თქვი რაზე მუშაობ — 'I am now working on...'.",
        "დაამატე ვადა — 'by Friday'.",
      ],
    },
    vocabulary: [
      {
        en: "update",
        ka: "განახლება / სტატუსი",
        exampleEn: "Here is a quick update.",
        exampleKa: "აი მოკლე განახლება.",
      },
      {
        en: "finish",
        ka: "დასრულება",
        exampleEn: "I finished the first part.",
        exampleKa: "დავასრულე პირველი ნაწილი.",
      },
      {
        en: "ready",
        ka: "მზად",
        exampleEn: "It will be ready by Friday.",
        exampleKa: "მზად იქნება პარასკევამდე.",
      },
    ],
    readAloudPhrases: [
      "Here is a quick update.",
      "I finished the first part of the report.",
      "I am now working on the numbers.",
      "It will be ready by Friday.",
    ],
  },

  // ---------------- ELEMENTARY ----------------
  business_elementary: {
    emailType: "update",
    level: "business_elementary",
    dailyFocusKa: "დღეს ვისწავლით სტატუს-განახლებას, რომელიც იყენებს მკაფიო სტრუქტურას — შესრულებული, მიმდინარე და შემდეგი ნაბიჯები.",
    estimatedMinutes: 12,
    warmUp: {
      kind: "compare",
      promptKa: "რომელი განახლება უფრო ადვილი წასაკითხია?",
      options: [
        {
          label: "A",
          text: "Done: design finished. In progress: testing. Next: launch on Monday.",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "We finished the design and now we are testing and then we will launch on Monday hopefully.",
          isBetter: false,
          issuesKa: [
            "ერთი გრძელი წინადადება — ძნელი წასაკითხია.",
            "'hopefully' გაურკვევლობას ამატებს.",
          ],
        },
      ],
      explanationKa:
        "მოკლე, სტრუქტურირებული განახლება (Done / In progress / Next) ბევრად ადვილი წასაკითხია, ვიდრე ერთი გრძელი წინადადება.",
    },
    learn: {
      titleKa: "სტრუქტურირებული განახლება",
      explanationKa:
        "კარგი განახლება იყენებს მკაფიო სტრუქტურას, რომ მკითხველმა სწრაფად გაიგოს მდგომარეობა. სამი მარტივი ნაწილი: რა შესრულდა, რა მიმდინარეობს და რა არის შემდეგი. მოკლე პუნქტები კარგად მუშაობს.",
      structure: [
        {
          partKa: "მოკლე შესავალი",
          purposeKa: "თქვი რაზეა განახლება.",
          exampleEn: "Here's a quick update on the website project.",
        },
        {
          partKa: "შესრულებული",
          purposeKa: "რა დასრულდა.",
          exampleEn: "Done: the homepage design is finished.",
        },
        {
          partKa: "მიმდინარე",
          purposeKa: "რაზე მუშაობ ახლა.",
          exampleEn: "In progress: we are testing the pages.",
        },
        {
          partKa: "შემდეგი",
          purposeKa: "რა იქნება შემდეგ.",
          exampleEn: "Next: launch is planned for Monday.",
        },
      ],
      examples: [
        {
          en: "Here's a quick update on the project.",
          ka: "აი მოკლე განახლება პროექტზე.",
          noteKa: "კარგი დასაწყისი განახლებისთვის.",
        },
        {
          en: "The homepage design is finished.",
          ka: "მთავარი გვერდის დიზაინი დასრულებულია.",
        },
        {
          en: "Launch is planned for Monday.",
          ka: "გაშვება ორშაბათისთვის იგეგმება.",
          noteKa: "მკაფიო შემდეგი ნაბიჯი ვადით.",
        },
      ],
    },
    realExample: {
      contextKa: "დავითი ხელმძღვანელობს ვებსაიტის პროექტს. ის უგზავნის კვირის განახლებას გუნდს.",
      subject: "Website project — weekly update",
      body: "Hi team,\n\nHere's a quick update on the website project.\n\nDone: the homepage and about page designs are finished.\nIn progress: we're testing all pages on mobile.\nNext: we plan to launch on Monday.\n\nLet me know if you have any questions.\n\nBest,\nDavit",
      annotationsKa: [
        "subject line აჩვენებს რაზეა და რომ ეს რეგულარული განახლებაა.",
        "სამი მკაფიო ნაწილი (Done / In progress / Next) ადვილი წასაკითხია.",
        "სთავაზობს კითხვების დასმას — ღია კომუნიკაცია.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ მუშაობ პროექტზე და გუნდს ან მენეჯერს სჭირდება კვირის განახლება. დაწერე სტრუქტურირებული სტატუს-განახლება: რა შესრულდა, რა მიმდინარეობს და რა არის შემდეგი.",
      recipientRole: "your team or manager",
      promptKa: "დაწერე 4-6 წინადადება. გამოიყენე მკაფიო სტრუქტურა (Done / In progress / Next).",
      hintsKa: [
        "დაიწყე მოკლე შესავლით — 'Here's a quick update on...'.",
        "დაყავი სამ ნაწილად: შესრულებული, მიმდინარე, შემდეგი.",
        "დაამატე ვადები სადაც შესაძლებელია.",
      ],
    },
    vocabulary: [
      {
        en: "in progress",
        ka: "მიმდინარე / მიმდინარეობს",
        exampleEn: "Testing is in progress.",
        exampleKa: "ტესტირება მიმდინარეობს.",
      },
      {
        en: "launch",
        ka: "გაშვება",
        exampleEn: "Launch is planned for Monday.",
        exampleKa: "გაშვება ორშაბათს იგეგმება.",
      },
      {
        en: "plan to",
        ka: "გეგმა / აპირებ",
        exampleEn: "We plan to launch next week.",
        exampleKa: "ვგეგმავთ გაშვებას მომავალ კვირას.",
      },
      {
        en: "test",
        ka: "ტესტირება / შემოწმება",
        exampleEn: "We are testing the pages.",
        exampleKa: "ვამოწმებთ გვერდებს.",
      },
    ],
    readAloudPhrases: [
      "Here's a quick update on the website project.",
      "The homepage and about page designs are finished.",
      "We're testing all pages on mobile.",
      "We plan to launch on Monday.",
    ],
  },

  // ---------------- INTERMEDIATE ----------------
  business_intermediate: {
    emailType: "update",
    level: "business_intermediate",
    dailyFocusKa: "დღეს ვისწავლით პროფესიონალურ განახლებას, რომელიც იწყება მოკლე შეჯამებით (TL;DR) და შემდეგ აძლევს დეტალებს.",
    estimatedMinutes: 15,
    warmUp: {
      kind: "spot_mistakes",
      promptKa: "ეს განახლება სუსტია — რა აკლია?",
      options: [
        {
          label: "A",
          text: "Hi Sarah,\n\nShort version: we're on track for the June 15 launch, with one risk on the payment integration.\n\nDetails: design and content are done. Payment integration is 80% complete but depends on the vendor's API, which has been slow. I've flagged it and have a backup plan if needed.\n\nBest,\nMari",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi Sarah,\n\nThe design is done and content is done too. Payment integration is at 80 percent but the vendor API is slow so there might be a risk but I think we are still mostly on track for June 15 probably.\n\nBest,\nMari",
          isBetter: false,
          issuesKa: [
            "არ იწყება მთავარი დასკვნით — მკითხველი უნდა ეძებოს მას.",
            "ერთ აბზაცში ყველაფერი აურიეს — ძნელი გასაგებია.",
            "'probably' და 'I think' გაურკვევლობას ამატებს.",
          ],
        },
      ],
      explanationKa:
        "პროფესიონალური განახლება იწყება მთავარი დასკვნით (TL;DR), შემდეგ აძლევს დეტალებს. დაკავებულ ადამიანს შეუძლია მხოლოდ პირველი ხაზი წაიკითხოს და მაინც გაიგოს მთავარი.",
    },
    learn: {
      titleKa: "TL;DR + დეტალები: განახლება დაკავებული ხალხისთვის",
      explanationKa:
        "დაკავებული ადამიანები ჯერ მთავარ დასკვნას ეძებენ. ამიტომ კარგი განახლება იწყება მოკლე შეჯამებით ('Short version:') და შემდეგ აძლევს დეტალებს ვისაც სჭირდება. ასევე მნიშვნელოვანია რისკების ღიად აღნიშვნა — ეს ნდობას ზრდის.",
      structure: [
        {
          partKa: "TL;DR (მოკლე ვერსია)",
          purposeKa: "მთავარი დასკვნა ერთ წინადადებაში.",
          exampleEn: "Short version: we're on track for the June 15 launch, with one risk.",
        },
        {
          partKa: "დეტალები",
          purposeKa: "ახსენი მდგომარეობა უფრო ვრცლად.",
          exampleEn: "Details: design and content are done. Payment integration is 80% complete.",
        },
        {
          partKa: "რისკები და გეგმა",
          purposeKa: "ღიად აღნიშნე პრობლემები + გამოსავალი.",
          exampleEn: "The vendor API has been slow. I have a backup plan if needed.",
        },
      ],
      examples: [
        {
          en: "Short version: we're on track, with one risk.",
          ka: "მოკლედ: გრაფიკში ვართ, ერთი რისკით.",
          noteKa: "მთავარი დასკვნა პირველ ხაზში.",
        },
        {
          en: "Payment integration is 80% complete.",
          ka: "გადახდის ინტეგრაცია 80%-ით დასრულებულია.",
          noteKa: "კონკრეტული რიცხვი > ბუნდოვანი 'almost done'.",
        },
        {
          en: "I've flagged it and have a backup plan.",
          ka: "აღვნიშნე ეს და მაქვს სარეზერვო გეგმა.",
          noteKa: "რისკის აღიარება გამოსავალთან ერთად აშენებს ნდობას.",
        },
      ],
    },
    realExample: {
      contextKa: "მარი ხელმძღვანელობს პროდუქტის გაშვებას. ის უგზავნის განახლებას მენეჯერს, რომელსაც სწრაფად სჭირდება მთავარი სურათი.",
      subject: "Launch update — on track, one risk flagged",
      body: "Hi Sarah,\n\nShort version: we're on track for the June 15 launch, with one risk on the payment integration that I'm actively managing.\n\nDetails:\n- Design and content: done.\n- Payment integration: 80% complete, but it depends on the vendor's API, which has been slower than promised.\n- Everything else is on schedule.\n\nI've already flagged the API delay to the vendor and have a backup provider lined up if we don't see progress by Wednesday.\n\nHappy to discuss if useful.\n\nBest,\nMari",
      annotationsKa: [
        "subject line თავადვე აჩვენებს მთავარ დასკვნას — 'on track, one risk'.",
        "'Short version' აძლევს დაკავებულ მკითხველს მთავარს მაშინვე.",
        "რისკი აღიარებულია გამოსავალთან ერთად — პროფესიონალური და დამამშვიდებელი.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ ხელმძღვანელობ პროექტს ან ამოცანას და უნდა გაუგზავნო განახლება მენეჯერს, რომელსაც სწრაფად სჭირდება მთავარი სურათი. დაწერე განახლება, რომელიც იწყება მოკლე შეჯამებით და შემდეგ აძლევს დეტალებს, მათ შორის ნებისმიერ რისკს.",
      recipientRole: "a busy manager",
      promptKa: "დაწერე 5-7 წინადადება. დაიწყე TL;DR-ით, შემდეგ დეტალები. ღიად აღნიშნე რისკები გამოსავალთან ერთად.",
      hintsKa: [
        "პირველი ხაზი = მთავარი დასკვნა.",
        "შემდეგ დაამატე დეტალები კონკრეტული ფაქტებით.",
        "აღნიშნე ნებისმიერი რისკი და შენი გეგმა მის მოსაგვარებლად.",
        "მოერიდე 'probably', 'I think' ტიპის გაურკვევლობას.",
      ],
    },
    vocabulary: [
      {
        en: "on track",
        ka: "გრაფიკში / სწორ გზაზე",
        exampleEn: "We're on track for the launch.",
        exampleKa: "გრაფიკში ვართ გაშვებისთვის.",
      },
      {
        en: "risk",
        ka: "რისკი",
        exampleEn: "There's one risk I'm managing.",
        exampleKa: "არის ერთი რისკი, რომელსაც ვმართავ.",
      },
      {
        en: "flag",
        ka: "აღნიშვნა / ყურადღების მიპყრობა",
        exampleEn: "I've flagged the delay.",
        exampleKa: "აღვნიშნე შეფერხება.",
      },
      {
        en: "backup plan",
        ka: "სარეზერვო გეგმა",
        exampleEn: "I have a backup plan ready.",
        exampleKa: "მაქვს მზად სარეზერვო გეგმა.",
      },
      {
        en: "on schedule",
        ka: "გრაფიკის მიხედვით",
        exampleEn: "Everything else is on schedule.",
        exampleKa: "დანარჩენი ყველაფერი გრაფიკშია.",
      },
    ],
    readAloudPhrases: [
      "Short version: we're on track for the June fifteenth launch, with one risk.",
      "Payment integration is eighty percent complete.",
      "I've already flagged the API delay to the vendor.",
      "I have a backup provider lined up if needed.",
    ],
  },

  // ---------------- ADVANCED ----------------
  business_advanced: {
    emailType: "update",
    level: "business_advanced",
    dailyFocusKa: "დღეს დავხვეწავთ განახლებას, რომელიც არა მხოლოდ ინფორმაციას აწვდის, არამედ მართავს მოლოდინებს და აჩვენებს კონტროლს რთულ სიტუაციაშიც.",
    estimatedMinutes: 15,
    warmUp: {
      kind: "spot_mistakes",
      promptKa: "ცუდი ამბის შემცველი განახლებაა — რომელი უკეთ მართავს სიტუაციას?",
      options: [
        {
          label: "A",
          text: "Hi all,\n\nHeadline: we're going to miss the original deadline by about a week, and I want to walk you through why and what I'm doing about it.\n\nThe delay comes from a scope change the client requested last week, which added two features. Rather than rush and ship something fragile, I've rebaselined to June 22. I've already adjusted the team's plan and notified the client, who is comfortable with the new date.\n\nHappy to discuss trade-offs if anyone wants to pull the date back in.\n\nBest,\nNika",
          isBetter: true,
          issuesKa: [],
        },
        {
          label: "B",
          text: "Hi all,\n\nUnfortunately we are going to be late. The client added some things and now we can't make the deadline. We are doing our best and hopefully it won't be too late.\n\nSorry about this.\n\nBest,\nNika",
          isBetter: false,
          issuesKa: [
            "იწყება ბოდიშითა და თავდაცვით — არა კონტროლით.",
            "არ აძლევს კონკრეტულ ახალ ვადას ან გეგმას.",
            "'hopefully' და 'doing our best' სისუსტეს აჩვენებს, არა მართვას.",
          ],
        },
      ],
      explanationKa:
        "მაღალი დონის განახლება ცუდ ამბავსაც კი მართვის პოზიციიდან აწვდის. A აძლევს კონკრეტულ ახალ ვადას, ხსნის მიზეზს და აჩვენებს, რომ უკვე მიიღო ზომები — ეს ნდობას ინარჩუნებს.",
    },
    learn: {
      titleKa: "განახლება, რომელიც მართავს მოლოდინებს",
      explanationKa:
        "მაღალ დონეზე განახლება არა მხოლოდ ინფორმაციაა — ის მოლოდინების მართვის ინსტრუმენტია. განსაკუთრებით ცუდი ამბის დროს: დაიწყე მთავარი შეტყობინებით პირდაპირ, ახსენი მიზეზი დამნაშავის ძებნის გარეშე, მიეცი კონკრეტული ახალი გეგმა და აჩვენე, რომ უკვე მოქმედებ. ეს გადააქცევს პრობლემას მართული სიტუაციის დემონსტრირებად.",
      structure: [
        {
          partKa: "პირდაპირი სათაური",
          purposeKa: "თქვი მთავარი მაშინვე, ბოდიშის გარეშე.",
          exampleEn: "Headline: we're going to miss the deadline by about a week.",
        },
        {
          partKa: "მიზეზი კონტექსტით",
          purposeKa: "ახსენი რატომ, ობიექტურად.",
          exampleEn: "The delay comes from a scope change the client requested.",
        },
        {
          partKa: "გადაწყვეტილება და ახალი გეგმა",
          purposeKa: "აჩვენე კონტროლი კონკრეტიკით.",
          exampleEn: "I've rebaselined to June 22 and adjusted the team's plan.",
        },
        {
          partKa: "დიალოგის მოწვევა",
          purposeKa: "შესთავაზე ალტერნატივების განხილვა.",
          exampleEn: "Happy to discuss trade-offs if we want to pull the date back in.",
        },
      ],
      examples: [
        {
          en: "Headline: we're going to miss the deadline by about a week.",
          ka: "მთავარი: დაახლოებით ერთი კვირით ვაგვიანებთ ვადას.",
          noteKa: "პირდაპირი, თავდაჯერებული გახსნა — არა ბოდიში.",
        },
        {
          en: "Rather than rush and ship something fragile, I've rebaselined to June 22.",
          ka: "იმის ნაცვლად, რომ ვიჩქაროთ და სუსტი პროდუქტი გამოვუშვათ, ვადა 22 ივნისზე გადავიტანე.",
          noteKa: "აჩვენებს გააზრებულ გადაწყვეტილებას, არა უბრალო შეფერხებას.",
        },
        {
          en: "I've already adjusted the plan and notified the client.",
          ka: "უკვე შევასწორე გეგმა და ვაცნობე კლიენტს.",
          noteKa: "მოქმედება უკვე შესრულებულია — აჩვენებს კონტროლს.",
        },
      ],
    },
    realExample: {
      contextKa: "ნიკა ხელმძღვანელობს პროექტს, რომელიც ვადას აცდენს კლიენტის მიერ მოთხოვნილი ცვლილების გამო. ის უგზავნის განახლებას, რომელიც მართავს სიტუაციას თავდაჯერებულად.",
      subject: "Timeline change: rebaselined to June 22 (here's why)",
      body: "Hi all,\n\nHeadline: we're going to move the launch from June 15 to June 22 — about a week — and I want to walk you through why and what I've already done about it.\n\nThe change comes from a scope request the client made last week, adding two features that touch the checkout flow. Rushing those in by the original date would mean shipping something fragile, which is a worse outcome for everyone.\n\nSo I've rebaselined to June 22. I've already reworked the team's sprint plan, and I've spoken with the client, who prefers the slightly later date over a rushed release.\n\nIf pulling the date back in matters more than scope, I'm happy to walk through the trade-offs — we could defer one feature to a fast follow. Just let me know.\n\nBest,\nNika",
      annotationsKa: [
        "subject line აძლევს ახალ ვადას და გვპირდება ახსნას — გამჭვირვალე და თავდაჯერებული.",
        "ხსნის მიზეზს ობიექტურად, დამნაშავის ძებნის გარეშე.",
        "აჩვენებს, რომ გადაწყვეტილება უკვე მიღებულია და ზომები მიღებულია — მართვის დემონსტრირება.",
        "სთავაზობს კონკრეტულ ალტერნატივას (feature defer), რაც აჩვენებს მოქნილობას.",
      ],
    },
    practice: {
      scenarioKa:
        "შენ უნდა გაუგზავნო განახლება რთული ამბით — ვადის აცილება, ბიუჯეტის გადაჭარბება, ან სერიოზული პრობლემა. დაწერე განახლება, რომელიც პირდაპირ ამბობს მთავარს, ხსნის მიზეზს, აძლევს კონკრეტულ ახალ გეგმას და აჩვენებს, რომ უკვე მოქმედებ.",
      recipientRole: "leadership or an important client",
      promptKa: "დაწერე 6-9 წინადადება. მართე სიტუაცია კონტროლის პოზიციიდან — არა ბოდიშით, არამედ მკაფიო გეგმით.",
      hintsKa: [
        "დაიწყე პირდაპირ მთავარი ამბით, არა ბოდიშით.",
        "ახსენი მიზეზი ობიექტურად, დამნაშავის ძებნის გარეშე.",
        "მიეცი კონკრეტული ახალი ვადა ან გეგმა.",
        "აჩვენე, რომ უკვე მიიღე ზომები, და შესთავაზე ალტერნატივები.",
      ],
    },
    vocabulary: [
      {
        en: "headline",
        ka: "მთავარი / სათაური (მთავარი აზრი)",
        exampleEn: "Headline: we're moving the date.",
        exampleKa: "მთავარი: ვადას გადავიტანთ.",
      },
      {
        en: "scope change",
        ka: "სამუშაოს ფარგლების ცვლილება",
        exampleEn: "The delay came from a scope change.",
        exampleKa: "შეფერხება სამუშაოს ფარგლების ცვლილებამ გამოიწვია.",
      },
      {
        en: "rebaseline",
        ka: "ვადის/გეგმის ხელახლა განსაზღვრა",
        exampleEn: "I've rebaselined to June 22.",
        exampleKa: "ვადა 22 ივნისზე გადავსაზღვრე.",
      },
      {
        en: "trade-off",
        ka: "კომპრომისი / დათმობა",
        exampleEn: "Let's discuss the trade-offs.",
        exampleKa: "მოდი განვიხილოთ კომპრომისები.",
      },
      {
        en: "fast follow",
        ka: "სწრაფი მომდევნო გამოშვება",
        exampleEn: "We could defer it to a fast follow.",
        exampleKa: "შეგვიძლია გადავიტანოთ სწრაფ მომდევნო გამოშვებაზე.",
      },
    ],
    readAloudPhrases: [
      "Headline: we're going to move the launch from June fifteenth to June twenty-second.",
      "Rushing those in by the original date would mean shipping something fragile.",
      "I've already reworked the team's sprint plan and spoken with the client.",
      "I'm happy to walk through the trade-offs.",
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
  request,
  update,
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