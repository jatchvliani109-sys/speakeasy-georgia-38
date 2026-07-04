// Pre-made role cards for the RANDOM interview mode (შემთხვევითი გასაუბრება).
// Each card is a complete interview setup — briefing, warm-ups, opening line —
// so random mode starts instantly with ZERO AI cost, like the email lessons.
// The conversational loop itself is still live AI (that's the practice).

export type RoleCardWarmUp = {
  promptKa: string;
  contextEn: string;
  options: { label: string; text: string; isBetter: boolean; whyKa: string }[];
};

export type RoleCard = {
  scenarioKey: string;
  briefing: {
    companyName: string;
    companyType: string;
    industryKa: string;
    roleTitle: string;
    roleTitleKa: string;
    interviewerName: string;
    interviewerTitle: string;
    aboutCompanyKa: string;
    whatToExpectKa: string;
  };
  warmUp: RoleCardWarmUp[];
  openingLineEn: string;
  estimatedMinutes: number;
};

export const ROLE_CARDS: RoleCard[] = [
  {
    scenarioKey: "sales-manager-retail",
    briefing: {
      companyName: "Brightline Retail Group",
      companyType: "national retail chain",
      industryKa: "საცალო ვაჭრობა",
      roleTitle: "Sales Manager",
      roleTitleKa: "გაყიდვების მენეჯერი",
      interviewerName: "Sarah Coleman",
      interviewerTitle: "Regional Sales Director",
      aboutCompanyKa:
        "Brightline საცალო ვაჭრობის ქსელია 40-ზე მეტი მაღაზიით. ისინი ეძებენ გაყიდვების მენეჯერს, რომელიც გუნდს უხელმძღვანელებს და გაყიდვების გეგმას შეასრულებს.",
      whatToExpectKa:
        "ელოდე კითხვებს გუნდის მართვაზე, გაყიდვების შედეგებზე და რთულ კლიენტებთან მუშაობაზე.",
    },
    warmUp: [
      {
        promptKa: "რომელი პასუხი უფრო ძლიერია გასაუბრების დასაწყისში?",
        contextEn: "So, tell me a little about yourself.",
        options: [
          {
            label: "A",
            text: "I have five years in retail sales, and last year my team exceeded its target by 15%.",
            isBetter: true,
            whyKa: "კონკრეტული ციფრები და შედეგები მაშინვე ძლიერ შთაბეჭდილებას ტოვებს.",
          },
          {
            label: "B",
            text: "Well, I like working with people and I'm a very hard worker.",
            isBetter: false,
            whyKa: "ზოგადი კლიშეებია — არაფერს ამბობს რეალურ შედეგებზე.",
          },
        ],
      },
      {
        promptKa: "როგორ უპასუხებ კითხვას სისუსტეზე?",
        contextEn: "What would you say is your biggest weakness?",
        options: [
          {
            label: "A",
            text: "I used to take on too much myself; now I delegate more and track tasks with my team weekly.",
            isBetter: true,
            whyKa: "რეალურ სისუსტეს ასახელებს და აჩვენებს, როგორ იმუშავა მასზე.",
          },
          {
            label: "B",
            text: "Honestly, I'm a perfectionist — I just work too hard.",
            isBetter: false,
            whyKa: "გაცვეთილი პასუხია, რომელსაც ინტერვიუერები აღარ ენდობიან.",
          },
        ],
      },
    ],
    openingLineEn:
      "Hi, thanks for coming in today! I'm Sarah, Regional Sales Director here at Brightline. Before we dive in — how has your day been so far?",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "accountant-firm",
    briefing: {
      companyName: "Meridian Advisory",
      companyType: "mid-size accounting firm",
      industryKa: "ფინანსები და აღრიცხვა",
      roleTitle: "Accountant",
      roleTitleKa: "ბუღალტერი",
      interviewerName: "David Reyes",
      interviewerTitle: "Finance Manager",
      aboutCompanyKa:
        "Meridian საბუღალტრო და საკონსულტაციო ფირმაა, რომელიც მცირე და საშუალო ბიზნესებს ემსახურება. ეძებენ ზუსტ და პასუხისმგებელ ბუღალტერს.",
      whatToExpectKa:
        "ელოდე კითხვებს სიზუსტეზე, ვადების დაცვასა და ფინანსურ ანგარიშგებაზე.",
    },
    warmUp: [
      {
        promptKa: "რომელი პასუხი აჩვენებს პროფესიონალიზმს დეტალებზე საუბრისას?",
        contextEn: "How do you make sure your reports are accurate?",
        options: [
          {
            label: "A",
            text: "I reconcile accounts weekly and use a checklist before submitting any report.",
            isBetter: true,
            whyKa: "კონკრეტული სისტემა და პროცესი — სანდოობის ნიშანი.",
          },
          {
            label: "B",
            text: "I'm just naturally very careful, so mistakes don't really happen.",
            isBetter: false,
            whyKa: "თვითდაჯერება პროცესის გარეშე ინტერვიუერს ვერ არწმუნებს.",
          },
        ],
      },
      {
        promptKa: "როგორ ისაუბრებ ვადის დაცვაზე წნეხის ქვეშ?",
        contextEn: "Tell me about a time you had a tight deadline.",
        options: [
          {
            label: "A",
            text: "During tax season I prioritized filings by risk, worked with two colleagues, and we submitted everything a day early.",
            isBetter: true,
            whyKa: "კონკრეტული სიტუაცია, ქმედება და შედეგი — სრულყოფილი სტრუქტურა.",
          },
          {
            label: "B",
            text: "I just stayed late every night until it was done.",
            isBetter: false,
            whyKa: "მონდომებას აჩვენებს, მაგრამ არა ჭკვიან მუშაობას ან პრიორიტეტიზაციას.",
          },
        ],
      },
    ],
    openingLineEn:
      "Good morning! I'm David, the Finance Manager at Meridian. Thanks for making the time — did you find our office easily?",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "marketing-specialist-agency",
    briefing: {
      companyName: "Pulse Creative",
      companyType: "digital marketing agency",
      industryKa: "მარკეტინგი",
      roleTitle: "Marketing Specialist",
      roleTitleKa: "მარკეტინგის სპეციალისტი",
      interviewerName: "Emma Larsen",
      interviewerTitle: "Head of Marketing",
      aboutCompanyKa:
        "Pulse Creative ციფრული მარკეტინგის სააგენტოა, რომელიც ბრენდებს სოციალურ მედიასა და რეკლამაში ეხმარება. ეძებენ კრეატიულ და შედეგზე ორიენტირებულ სპეციალისტს.",
      whatToExpectKa:
        "ელოდე კითხვებს კამპანიებზე, ციფრებზე (CTR, კონვერსია) და კრეატიულ იდეებზე.",
    },
    warmUp: [
      {
        promptKa: "რომელი პასუხი უფრო დამაჯერებელია კამპანიაზე საუბრისას?",
        contextEn: "Tell me about a campaign you're proud of.",
        options: [
          {
            label: "A",
            text: "I ran an Instagram campaign that doubled engagement and brought a 20% rise in leads in two months.",
            isBetter: true,
            whyKa: "შედეგები ციფრებით — მარკეტინგში ეს ყველაზე ძლიერი ენაა.",
          },
          {
            label: "B",
            text: "I made some really creative posts that everyone on the team loved.",
            isBetter: false,
            whyKa: "შიდა მოწონება არ არის ბიზნეს შედეგი.",
          },
        ],
      },
      {
        promptKa: "როგორ უპასუხებ, როცა შედეგი ვერ მიაღწიე?",
        contextEn: "Tell me about a campaign that didn't work.",
        options: [
          {
            label: "A",
            text: "One ad set underperformed, so I analyzed the audience data, shifted budget, and the next round improved by 30%.",
            isBetter: true,
            whyKa: "წარუმატებლობას სწავლად და გამოსწორებად აქცევს.",
          },
          {
            label: "B",
            text: "The client's product just wasn't very good, so there wasn't much I could do.",
            isBetter: false,
            whyKa: "პასუხისმგებლობის სხვაზე გადატანა ცუდი ნიშანია.",
          },
        ],
      },
    ],
    openingLineEn:
      "Hey, welcome to Pulse! I'm Emma, Head of Marketing. We're pretty informal here — grab a seat. How are you doing today?",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "project-manager-tech",
    briefing: {
      companyName: "Nexa Systems",
      companyType: "software development company",
      industryKa: "ტექნოლოგიები",
      roleTitle: "Project Manager",
      roleTitleKa: "პროექტის მენეჯერი",
      interviewerName: "Michael Osei",
      interviewerTitle: "Delivery Director",
      aboutCompanyKa:
        "Nexa Systems პროგრამულ პროდუქტებს ქმნის საერთაშორისო კლიენტებისთვის. ეძებენ პროექტის მენეჯერს, რომელიც ვადებსა და გუნდებს კარგად მართავს.",
      whatToExpectKa:
        "ელოდე კითხვებს ვადების მართვაზე, რისკებზე და გუნდებს შორის კომუნიკაციაზე.",
    },
    warmUp: [
      {
        promptKa: "რომელი პასუხი აჩვენებს ძლიერ პროექტის მართვას?",
        contextEn: "How do you handle a project that's falling behind schedule?",
        options: [
          {
            label: "A",
            text: "I identify the blocker, re-plan with the team, and inform stakeholders early with a revised timeline.",
            isBetter: true,
            whyKa: "პროაქტიული კომუნიკაცია და მკაფიო გეგმა — სწორედ ამას ეძებენ.",
          },
          {
            label: "B",
            text: "I push the team to work faster until we catch up.",
            isBetter: false,
            whyKa: "ზეწოლა გეგმის გარეშე გუნდს წვავს და პრობლემას არ აგვარებს.",
          },
        ],
      },
      {
        promptKa: "როგორ ისაუბრებ კონფლიქტზე გუნდში?",
        contextEn: "Two of your team members disagree strongly. What do you do?",
        options: [
          {
            label: "A",
            text: "I speak to each separately to understand their view, then bring them together around the shared goal.",
            isBetter: true,
            whyKa: "სტრუქტურირებული, მშვიდი მიდგომა კონფლიქტის მოგვარებაზე.",
          },
          {
            label: "B",
            text: "I usually just decide myself so we don't waste time arguing.",
            isBetter: false,
            whyKa: "სწრაფია, მაგრამ გუნდის ჩართულობასა და ნდობას კლავს.",
          },
        ],
      },
    ],
    openingLineEn:
      "Hi there, I'm Michael — I run delivery here at Nexa. Great to meet you. Can I get you a coffee or water before we start?",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "hr-specialist-corporate",
    briefing: {
      companyName: "Vertex Holdings",
      companyType: "corporate group",
      industryKa: "ადამიანური რესურსები",
      roleTitle: "HR Specialist",
      roleTitleKa: "HR სპეციალისტი",
      interviewerName: "Laura Bennett",
      interviewerTitle: "HR Director",
      aboutCompanyKa:
        "Vertex Holdings მსხვილი კორპორატიული ჯგუფია 300-ზე მეტი თანამშრომლით. ეძებენ HR სპეციალისტს რეკრუტინგისა და თანამშრომელთა კმაყოფილების მიმართულებით.",
      whatToExpectKa:
        "ელოდე კითხვებს რეკრუტინგზე, დელიკატურ სიტუაციებზე და კონფიდენციალურობაზე.",
    },
    warmUp: [
      {
        promptKa: "რომელი პასუხი აჩვენებს HR პროფესიონალიზმს?",
        contextEn: "An employee complains to you about their manager. What's your first step?",
        options: [
          {
            label: "A",
            text: "I listen fully, take notes, and explain the process — then gather facts before any conclusions.",
            isBetter: true,
            whyKa: "ნეიტრალურობა და პროცესის დაცვა HR-ის საფუძველია.",
          },
          {
            label: "B",
            text: "I'd go talk to the manager right away and tell them to fix it.",
            isBetter: false,
            whyKa: "ფაქტების გარეშე რეაგირება კონფიდენციალურობასაც არღვევს და ნდობასაც.",
          },
        ],
      },
      {
        promptKa: "როგორ ისაუბრებ რეკრუტინგის გამოცდილებაზე?",
        contextEn: "How do you decide if a candidate is a good fit?",
        options: [
          {
            label: "A",
            text: "I compare their answers against the role's key requirements and check for team-culture fit with structured questions.",
            isBetter: true,
            whyKa: "სტრუქტურირებული შეფასება სუბიექტურ შთაბეჭდილებაზე ძლიერია.",
          },
          {
            label: "B",
            text: "I usually trust my gut feeling about people — I'm rarely wrong.",
            isBetter: false,
            whyKa: "მხოლოდ ინტუიციაზე დაყრდნობა არაპროფესიონალურად ჟღერს.",
          },
        ],
      },
    ],
    openingLineEn:
      "Welcome! I'm Laura, HR Director at Vertex. It's always interesting to interview someone for an HR role — you know all the tricks. How are you feeling?",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "customer-support-lead",
    briefing: {
      companyName: "Cloudmile",
      companyType: "SaaS startup",
      industryKa: "მომხმარებელთა მხარდაჭერა",
      roleTitle: "Customer Support Lead",
      roleTitleKa: "მომხმარებელთა მხარდაჭერის ლიდი",
      interviewerName: "James Park",
      interviewerTitle: "Head of Operations",
      aboutCompanyKa:
        "Cloudmile SaaS სტარტაპია, რომლის მომხმარებლები მთელ მსოფლიოში არიან. ეძებენ მხარდაჭერის გუნდის ლიდს, რომელიც ხარისხსაც დაიცავს და გუნდსაც განავითარებს.",
      whatToExpectKa:
        "ელოდე კითხვებს რთულ მომხმარებლებზე, გუნდის სწავლებაზე და მეტრიკებზე.",
    },
    warmUp: [
      {
        promptKa: "რომელი პასუხი უკეთ აგვარებს გაბრაზებულ მომხმარებელს?",
        contextEn: "A customer is angry about a billing mistake. What do you say first?",
        options: [
          {
            label: "A",
            text: "I'm really sorry about this — let me look into it right now and fix it for you.",
            isBetter: true,
            whyKa: "ემპათია + დაუყოვნებელი ქმედება — მხარდაჭერის ოქროს წესი.",
          },
          {
            label: "B",
            text: "That's handled by the billing team, so you'll need to email them.",
            isBetter: false,
            whyKa: "მომხმარებლის გადაგდება სხვა გუნდზე იმედგაცრუებას აძლიერებს.",
          },
        ],
      },
      {
        promptKa: "როგორ ისაუბრებ გუნდის განვითარებაზე?",
        contextEn: "How would you improve a support team's quality?",
        options: [
          {
            label: "A",
            text: "I'd review real conversations weekly, share best answers, and coach each agent on one specific skill at a time.",
            isBetter: true,
            whyKa: "კონკრეტული, გაზომვადი განვითარების სისტემა.",
          },
          {
            label: "B",
            text: "I'd tell everyone to be more friendly and answer faster.",
            isBetter: false,
            whyKa: "ზოგადი მითითება სისტემის გარეშე ცვლილებას ვერ მოიტანს.",
          },
        ],
      },
    ],
    openingLineEn:
      "Hi! James here, I head up operations at Cloudmile. Thanks for hopping on. So — before the serious stuff, what got you into customer support?",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "graphic-designer-studio",
    briefing: {
      companyName: "Studio Form",
      companyType: "design studio",
      industryKa: "დიზაინი",
      roleTitle: "Graphic Designer",
      roleTitleKa: "გრაფიკული დიზაინერი",
      interviewerName: "Nina Alvarez",
      interviewerTitle: "Creative Director",
      aboutCompanyKa:
        "Studio Form ბრენდინგისა და ვიზუალური იდენტობის სტუდიაა. ეძებენ დიზაინერს, რომელსაც ძლიერი ესთეტიკაც აქვს და კლიენტთან კომუნიკაციაც შეუძლია.",
      whatToExpectKa:
        "ელოდე კითხვებს პორტფოლიოზე, კლიენტის უკუკავშირზე და კრეატიულ პროცესზე.",
    },
    warmUp: [
      {
        promptKa: "როგორ უპასუხებ კლიენტის კრიტიკას შენს დიზაინზე?",
        contextEn: "A client says they don't like your design. How do you respond?",
        options: [
          {
            label: "A",
            text: "I ask what specifically isn't working for them and what feeling they want instead — then I iterate.",
            isBetter: true,
            whyKa: "კრიტიკას ინფორმაციად აქცევს და პროფესიონალურ პროცესს აჩვენებს.",
          },
          {
            label: "B",
            text: "I explain why my design choices are correct and try to convince them.",
            isBetter: false,
            whyKa: "დაცვითი პოზიცია კლიენტთან ურთიერთობას აფუჭებს.",
          },
        ],
      },
      {
        promptKa: "რომელი პასუხი უფრო ძლიერია პორტფოლიოზე საუბრისას?",
        contextEn: "Walk me through your favorite project.",
        options: [
          {
            label: "A",
            text: "I redesigned a café brand — the goal was a warmer feel, and after launch their Instagram following grew 40%.",
            isBetter: true,
            whyKa: "მიზანი, გადაწყვეტა და გაზომვადი შედეგი ერთ პასუხში.",
          },
          {
            label: "B",
            text: "I did a logo I really love — the colors and typography are just beautiful.",
            isBetter: false,
            whyKa: "მხოლოდ ესთეტიკაზე საუბარი ბიზნეს ღირებულებას ტოვებს გარეთ.",
          },
        ],
      },
    ],
    openingLineEn:
      "Hi, come on in! I'm Nina, Creative Director at Studio Form. I had a quick look at your portfolio earlier — but first, tell me a bit about yourself.",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "software-developer-product",
    briefing: {
      companyName: "Arclight Labs",
      companyType: "product tech company",
      industryKa: "პროგრამირება",
      roleTitle: "Software Developer",
      roleTitleKa: "პროგრამისტი",
      interviewerName: "Tom Fischer",
      interviewerTitle: "Engineering Manager",
      aboutCompanyKa:
        "Arclight Labs საკუთარ პროდუქტზე მომუშავე ტექნოლოგიური კომპანიაა. ეძებენ დეველოპერს, რომელიც კოდის ხარისხზეც ზრუნავს და გუნდურ მუშაობაზეც.",
      whatToExpectKa:
        "ელოდე კითხვებს პროექტებზე, გუნდურ მუშაობაზე და პრობლემების გადაჭრაზე — არა ტექნიკურ ტესტს.",
    },
    warmUp: [
      {
        promptKa: "როგორ ისაუბრებ ტექნიკურ პრობლემაზე მარტივად?",
        contextEn: "Tell me about a difficult bug you fixed.",
        options: [
          {
            label: "A",
            text: "Payments were failing for some users; I traced it to a timezone issue, fixed it, and added a test so it can't return.",
            isBetter: true,
            whyKa: "მარტივი ენა, მკაფიო პრობლემა-გადაწყვეტა-პრევენცია სტრუქტურა.",
          },
          {
            label: "B",
            text: "There was a really complex race condition in the async pipeline with the mutex handling...",
            isBetter: false,
            whyKa: "ზედმეტად ტექნიკური ჟარგონი მსმენელს კარგავს — ადაპტირება ვერ აჩვენა.",
          },
        ],
      },
      {
        promptKa: "რომელი პასუხი აჩვენებს გუნდურ სიმწიფეს?",
        contextEn: "How do you handle code review feedback you disagree with?",
        options: [
          {
            label: "A",
            text: "I ask about their reasoning first — sometimes they see something I missed. If I still disagree, we discuss trade-offs.",
            isBetter: true,
            whyKa: "ღიაობა და პატივისცემა საკუთარი აზრის შენარჩუნებით.",
          },
          {
            label: "B",
            text: "I usually just accept the changes to avoid conflict.",
            isBetter: false,
            whyKa: "კონფლიქტის სრული არიდება საკუთარი ხედვის უქონლობად აღიქმება.",
          },
        ],
      },
    ],
    openingLineEn:
      "Hey, thanks for joining! I'm Tom, one of the engineering managers at Arclight. Don't worry — no live coding today, just a conversation. How's your week going?",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "financial-analyst-bank",
    briefing: {
      companyName: "Crestline Bank",
      companyType: "commercial bank",
      industryKa: "საბანკო სფერო",
      roleTitle: "Financial Analyst",
      roleTitleKa: "ფინანსური ანალიტიკოსი",
      interviewerName: "Rachel Whitmore",
      interviewerTitle: "Head of Analytics",
      aboutCompanyKa:
        "Crestline კომერციული ბანკია, რომელიც აანალიზებს კორპორატიულ კლიენტებს. ეძებენ ანალიტიკოსს, რომელიც ციფრებსაც ფლობს და დასკვნების მკაფიოდ წარდგენასაც.",
      whatToExpectKa:
        "ელოდე კითხვებს ანალიზზე, დეტალებზე ყურადღებაზე და რთული ინფორმაციის მარტივად ახსნაზე.",
    },
    warmUp: [
      {
        promptKa: "როგორ ახსნი რთულ ანალიზს მარტივად?",
        contextEn: "How would you explain a complex financial model to a non-finance manager?",
        options: [
          {
            label: "A",
            text: "I start with the conclusion, then show only the two or three numbers that drive it, with a simple chart.",
            isBetter: true,
            whyKa: "დასკვნით დაწყება და გამარტივება — ანალიტიკოსის მთავარი უნარი.",
          },
          {
            label: "B",
            text: "I'd walk them through the whole spreadsheet step by step so they see everything.",
            isBetter: false,
            whyKa: "სრული დეტალები არასპეციალისტს ბნევს და დროსაც კარგავს.",
          },
        ],
      },
      {
        promptKa: "რომელი პასუხი აჩვენებს სიზუსტისადმი მიდგომას?",
        contextEn: "You find an error in a report already sent to leadership. What do you do?",
        options: [
          {
            label: "A",
            text: "I verify the correct figure, send a short correction immediately, and add a check so it can't repeat.",
            isBetter: true,
            whyKa: "სისწრაფე, გამჭვირვალობა და პრევენცია — ნდობა ასე შენდება.",
          },
          {
            label: "B",
            text: "If it's a small error, I'd probably fix it quietly in the next report.",
            isBetter: false,
            whyKa: "შეცდომის დამალვა ნდობის ყველაზე სწრაფი დამანგრეველია.",
          },
        ],
      },
    ],
    openingLineEn:
      "Good afternoon, I'm Rachel — I lead the analytics team here at Crestline. Thanks for coming in. Shall we get started?",
    estimatedMinutes: 20,
  },
  {
    scenarioKey: "operations-manager-logistics",
    briefing: {
      companyName: "Swiftline Logistics",
      companyType: "logistics company",
      industryKa: "ლოგისტიკა და ოპერაციები",
      roleTitle: "Operations Manager",
      roleTitleKa: "ოპერაციების მენეჯერი",
      interviewerName: "Karen Doyle",
      interviewerTitle: "COO",
      aboutCompanyKa:
        "Swiftline ლოგისტიკური კომპანიაა, რომელიც ყოველდღიურად ასობით მიწოდებას მართავს. ეძებენ ოპერაციების მენეჯერს, რომელიც ქაოსში წესრიგს ქმნის.",
      whatToExpectKa:
        "ელოდე კითხვებს პროცესების გაუმჯობესებაზე, კრიზისებზე და გუნდის მართვაზე წნეხის ქვეშ.",
    },
    warmUp: [
      {
        promptKa: "როგორ უპასუხებ კრიზისულ სიტუაციაზე?",
        contextEn: "A key delivery truck breaks down during the busiest day. What do you do?",
        options: [
          {
            label: "A",
            text: "I reroute the most urgent orders to other vehicles, inform affected clients with new times, and arrange a backup truck.",
            isBetter: true,
            whyKa: "პრიორიტეტიზაცია + კომუნიკაცია + გადაწყვეტა — სამივე ერთ პასუხში.",
          },
          {
            label: "B",
            text: "I'd call the repair service and wait to see how long it takes.",
            isBetter: false,
            whyKa: "პასიური ლოდინი ოპერაციების მენეჯერისთვის სუსტი პასუხია.",
          },
        ],
      },
      {
        promptKa: "რომელი პასუხი აჩვენებს პროცესის აზროვნებას?",
        contextEn: "How do you find inefficiencies in a process?",
        options: [
          {
            label: "A",
            text: "I map the process end to end, measure where time is lost, and fix the biggest bottleneck first.",
            isBetter: true,
            whyKa: "გაზომვაზე დაფუძნებული, სისტემური მიდგომა.",
          },
          {
            label: "B",
            text: "I ask the team what annoys them and fix those things.",
            isBetter: false,
            whyKa: "გუნდის მოსმენა კარგია, მაგრამ გაზომვის გარეშე მთავარი პრობლემა შეიძლება გამოგრჩეს.",
          },
        ],
      },
    ],
    openingLineEn:
      "Hello! Karen Doyle, COO at Swiftline. I'll be honest — this role is not for everyone, but let's see if it's for you. Ready?",
    estimatedMinutes: 20,
  },
];

export function randomRoleCard(excludeKeys: string[] = []): RoleCard {
  const pool = ROLE_CARDS.filter((c) => !excludeKeys.includes(c.scenarioKey));
  const list = pool.length ? pool : ROLE_CARDS;
  return list[Math.floor(Math.random() * list.length)];
}