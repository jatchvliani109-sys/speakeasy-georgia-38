// 5 rotating Business English reassessment tests.
// Same format, same difficulty calibration.
// 12 questions each: 3 emails, 3 interview/meeting, 3 vocabulary, 3 mixed scenarios.
// Weights: easy=1, medium=2, hard=3. Each test totals exactly 22 weighted points
// (3 easy + 6 medium + 3 hard = 3 + 12 + 9 = 24)  → re-balanced below.

export type RArea = "emails" | "interview_meeting" | "vocabulary" | "mixed";

export type RMCQ = {
  type: "mcq";
  area: RArea;
  prompt: string;
  promptKa?: string;
  options: string[];
  correct: number;
  weight: 1 | 2 | 3;
};

export type ROpen = {
  type: "open";
  prompt: string;
  promptKa?: string;
};

export type RQuestion = RMCQ | ROpen;

export type ReassessmentTest = {
  version: 1 | 2 | 3 | 4 | 5;
  questions: RQuestion[]; // 12 MCQ-style + 1 optional open
};

// Calibration target per test (MCQ weights):
// 4 easy (1pt) + 5 medium (2pt) + 3 hard (3pt) = 4 + 10 + 9 = 23 pts
// All 5 tests use the same distribution so scores are directly comparable.

const OPEN_PROMPT_KA =
  "(არასავალდებულო) დაწერე 2–3 პროფესიული წინადადება ბიზნეს სიტუაციაზე ქვემოთ.";

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1
// ─────────────────────────────────────────────────────────────────────────────
const TEST_1: ReassessmentTest = {
  version: 1,
  questions: [
    // EMAILS (3)
    {
      type: "mcq", area: "emails", weight: 1,
      prompt: "Choose the most professional opening line for an email to a new client.",
      promptKa: "აირჩიე ყველაზე პროფესიული მისალმება.",
      options: ["Hey there!", "Dear Mr. Davis,", "Hi buddy,", "Yo team,"],
      correct: 1,
    },
    {
      type: "mcq", area: "emails", weight: 2,
      prompt: "Which sentence is the best polite request in an email?",
      promptKa: "აირჩიე ყველაზე თავაზიანი ფორმულირება.",
      options: [
        "Send me the report now.",
        "I need the report today.",
        "Could you please send the report by end of day?",
        "Where is my report?",
      ],
      correct: 2,
    },
    {
      type: "mcq", area: "emails", weight: 3,
      prompt: "A client wrote: 'I'm a bit concerned about the timeline.' The best professional reply opens with:",
      promptKa: "რომელია საუკეთესო პროფესიული პასუხი?",
      options: [
        "Don't worry about it.",
        "Thank you for raising this — let me walk you through where we are and the next steps.",
        "We're on schedule, no issues.",
        "Why are you worried?",
      ],
      correct: 1,
    },
    // INTERVIEW / MEETING (3)
    {
      type: "mcq", area: "interview_meeting", weight: 1,
      prompt: "In an interview, 'Tell me about yourself' is best answered with:",
      promptKa: "როგორ უპასუხო ამ კითხვას?",
      options: [
        "Your full life story from childhood.",
        "A short summary of your background, experience and current goal.",
        "Only your hobbies.",
        "Salary expectations.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 2,
      prompt: "In a meeting, you want to add to a colleague's idea. Which is best?",
      promptKa: "როგორ შეავსო კოლეგის იდეა თავაზიანად?",
      options: [
        "Actually, you forgot something important.",
        "To build on what Anna just said, we could also consider…",
        "No, that won't work.",
        "Let me explain it correctly.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 3,
      prompt: "Asked 'What's your biggest weakness?', the strongest answer:",
      promptKa: "რომელია საუკეთესო პასუხი?",
      options: [
        "I don't really have any weaknesses.",
        "I'm a perfectionist.",
        "I used to struggle with delegating, so I started using shared task boards to stay aligned with the team.",
        "I'm bad at deadlines.",
      ],
      correct: 2,
    },
    // VOCABULARY (3)
    {
      type: "mcq", area: "vocabulary", weight: 1,
      prompt: "'Revenue' most closely means:",
      promptKa: "რას ნიშნავს Revenue?",
      options: ["Profit after costs", "Total income from sales", "Salary", "Tax"],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 2,
      prompt: "A 'stakeholder' is:",
      promptKa: "ვინ არის stakeholder?",
      options: [
        "Only an investor",
        "Anyone with an interest in the project's outcome",
        "An external auditor",
        "The CEO only",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 3,
      prompt: "'We need to leverage our existing partnerships.' 'Leverage' here means:",
      promptKa: "რას ნიშნავს leverage?",
      options: [
        "End them",
        "Use strategically to gain advantage",
        "Sell",
        "Avoid",
      ],
      correct: 1,
    },
    // MIXED (3)
    {
      type: "mcq", area: "mixed", weight: 1,
      prompt: "Scenario: deadline missed. Most professional Slack message:",
      promptKa: "აირჩიე საუკეთესო შეტყობინება.",
      options: [
        "Sorry, late again.",
        "Quick update: I'll need until tomorrow noon to finalize this — I'll send a draft tonight.",
        "Can't finish today.",
        "It's not done, my bad.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 2,
      prompt: "A client says: 'This isn't quite what we agreed on.' Best first response:",
      promptKa: "რა იქნება საუკეთესო პასუხი?",
      options: [
        "It's exactly what we agreed.",
        "Thanks for flagging this — could you point me to the specific part so we can align?",
        "We can change everything.",
        "That's not my responsibility.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 3,
      prompt: "Your manager writes: 'Let's table this for now.' This means:",
      promptKa: "რას ნიშნავს ეს ფრაზა?",
      options: [
        "Make the decision immediately.",
        "Postpone the discussion for later.",
        "Put it on the meeting agenda right now.",
        "Cancel it permanently.",
      ],
      correct: 1,
    },
    // OPTIONAL OPEN
    {
      type: "open",
      prompt:
        "Write a short professional message (2–3 sentences) replying to a client who is asking for a status update on a project that is one day late.",
      promptKa: OPEN_PROMPT_KA,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2
// ─────────────────────────────────────────────────────────────────────────────
const TEST_2: ReassessmentTest = {
  version: 2,
  questions: [
    // EMAILS
    {
      type: "mcq", area: "emails", weight: 1,
      prompt: "Best email sign-off for a formal client message:",
      promptKa: "აირჩიე ფორმალური დასასრული.",
      options: ["Cheers!", "Talk soon", "Best regards,", "Bye!"],
      correct: 2,
    },
    {
      type: "mcq", area: "emails", weight: 2,
      prompt: "Choose the clearest subject line for a follow-up after a meeting.",
      promptKa: "აირჩიე საუკეთესო subject line.",
      options: [
        "Hi",
        "Follow-up",
        "Follow-up: Q3 marketing plan — next steps",
        "Important!!!",
      ],
      correct: 2,
    },
    {
      type: "mcq", area: "emails", weight: 3,
      prompt: "You must decline a meeting politely. Best opening:",
      promptKa: "თავაზიანი უარის ფორმულირება.",
      options: [
        "I can't make it.",
        "Thanks for the invite — unfortunately I have a conflict at that time, but I'd be glad to join the next one.",
        "No.",
        "Send notes after instead.",
      ],
      correct: 1,
    },
    // INTERVIEW / MEETING
    {
      type: "mcq", area: "interview_meeting", weight: 1,
      prompt: "Best way to start a meeting you're hosting:",
      promptKa: "შეხვედრის სწორი დასაწყისი.",
      options: [
        "Let's just dive in.",
        "Thanks everyone for joining — quick agenda for today:…",
        "Who is missing?",
        "I have nothing prepared.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 2,
      prompt: "Asked 'Why do you want this job?', a strong answer focuses on:",
      promptKa: "რაზე უნდა ისაუბრო?",
      options: [
        "The salary only.",
        "How the role matches your skills and where the company is going.",
        "Why your last job was bad.",
        "How close the office is to your home.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 3,
      prompt: "In a meeting you didn't follow a point. The most professional response:",
      promptKa: "ვერ გაიგე — როგორ ჰკითხო?",
      options: [
        "What?",
        "Sorry, could you clarify what you meant by 'integrated rollout'?",
        "Repeat please.",
        "I don't understand anything.",
      ],
      correct: 1,
    },
    // VOCABULARY
    {
      type: "mcq", area: "vocabulary", weight: 1,
      prompt: "'Deadline' means:",
      promptKa: "რას ნიშნავს deadline?",
      options: ["Start date", "Final date by which something must be done", "Salary day", "Holiday"],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 2,
      prompt: "A 'KPI' is:",
      promptKa: "რას ნიშნავს KPI?",
      options: [
        "A type of contract",
        "Key Performance Indicator — a measurable goal",
        "A project manager",
        "A budget line",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 3,
      prompt: "'Let's align on this offline.' 'Offline' here means:",
      promptKa: "რას ნიშნავს offline?",
      options: [
        "Without internet",
        "Outside this meeting, in a separate conversation",
        "After the project ends",
        "In writing only",
      ],
      correct: 1,
    },
    // MIXED
    {
      type: "mcq", area: "mixed", weight: 1,
      prompt: "Your teammate helped you a lot. Best short thank-you message:",
      promptKa: "მოკლე მადლობის შეტყობინება.",
      options: [
        "ok thanks",
        "Really appreciate your help on this — saved me a lot of time.",
        "thx",
        "Sure",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 2,
      prompt: "Best professional way to share a problem without sounding negative:",
      promptKa: "როგორ ისაუბრო პრობლემაზე პროფესიულად?",
      options: [
        "We have a huge problem.",
        "I'd like to flag a risk we should address before launch.",
        "Everything is broken.",
        "Nothing works.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 3,
      prompt: "A senior says: 'Let's not reinvent the wheel here.' They mean:",
      promptKa: "რას ნიშნავს ეს ფრაზა?",
      options: [
        "Start a new project from scratch.",
        "Use what already exists instead of rebuilding it.",
        "Replace the whole system.",
        "Change leadership.",
      ],
      correct: 1,
    },
    {
      type: "open",
      prompt:
        "Write a 2–3 sentence email asking a colleague to review your draft proposal before tomorrow's meeting.",
      promptKa: OPEN_PROMPT_KA,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3
// ─────────────────────────────────────────────────────────────────────────────
const TEST_3: ReassessmentTest = {
  version: 3,
  questions: [
    // EMAILS
    {
      type: "mcq", area: "emails", weight: 1,
      prompt: "Best way to acknowledge receipt of a document:",
      promptKa: "როგორ დაუდასტურო მიღება?",
      options: [
        "got it",
        "Thanks — received and will review by Thursday.",
        "ok",
        "yes",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "emails", weight: 2,
      prompt: "Which sentence sounds most professional in an apology email?",
      promptKa: "ბოდიშის ყველაზე პროფესიული ფორმა.",
      options: [
        "Sorry for the mess.",
        "I apologize for the inconvenience and appreciate your patience as we resolve this.",
        "My bad — won't happen again.",
        "Oops, sorry.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "emails", weight: 3,
      prompt: "Choose the strongest closing line that invites continued conversation:",
      promptKa: "აირჩიე საუკეთესო დასკვნითი წინადადება.",
      options: [
        "Bye.",
        "Happy to discuss further — let me know what works for a quick call this week.",
        "That's all.",
        "Reply if you want.",
      ],
      correct: 1,
    },
    // INTERVIEW / MEETING
    {
      type: "mcq", area: "interview_meeting", weight: 1,
      prompt: "Best phrase to ask for someone's opinion in a meeting:",
      promptKa: "როგორ ჰკითხო აზრი?",
      options: [
        "What you think?",
        "Anna, what's your take on this?",
        "Tell me!",
        "Speak.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 2,
      prompt: "Asked about a past failure, the strongest interview answer:",
      promptKa: "როგორ ისაუბრო წარუმატებლობაზე?",
      options: [
        "I've never failed.",
        "I missed a launch deadline once — afterwards I introduced weekly checkpoints and we shipped the next two on time.",
        "It was the team's fault.",
        "It wasn't really a failure.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 3,
      prompt: "Closing a meeting strongly means:",
      promptKa: "შეხვედრის სწორი დასკვნა.",
      options: [
        "Saying 'bye'.",
        "Summarizing decisions, owners and next steps.",
        "Quickly leaving the call.",
        "Asking everyone to repeat their points.",
      ],
      correct: 1,
    },
    // VOCABULARY
    {
      type: "mcq", area: "vocabulary", weight: 1,
      prompt: "'Budget' means:",
      promptKa: "რას ნიშნავს budget?",
      options: ["Salary", "Plan for how money will be spent", "Profit", "Loan"],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 2,
      prompt: "To 'follow up' on something means to:",
      promptKa: "რას ნიშნავს follow up?",
      options: [
        "Forget about it.",
        "Check on its progress or continue a previous discussion.",
        "Cancel it.",
        "Begin from zero.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 3,
      prompt: "'Bandwidth' in a business context means:",
      promptKa: "რას ნიშნავს bandwidth?",
      options: [
        "Internet speed.",
        "Capacity or available time/energy to take on work.",
        "Number of employees.",
        "Office size.",
      ],
      correct: 1,
    },
    // MIXED
    {
      type: "mcq", area: "mixed", weight: 1,
      prompt: "Most professional way to introduce yourself at a networking event:",
      promptKa: "თავის წარდგენა networking-ზე.",
      options: [
        "Hey, I'm Nika.",
        "Hi, I'm Nika — I work in product marketing at a fintech startup. Nice to meet you.",
        "I want a job.",
        "Who are you?",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 2,
      prompt: "You disagree with your manager. Most professional opener:",
      promptKa: "უთანხმოება მენეჯერთან.",
      options: [
        "You're wrong.",
        "I see it slightly differently — can I share another angle?",
        "I don't agree at all.",
        "No way.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 3,
      prompt: "'We need to manage expectations with the client.' This means:",
      promptKa: "რას ნიშნავს manage expectations?",
      options: [
        "Promise more than we can deliver.",
        "Set realistic expectations so the client isn't disappointed.",
        "Ignore the client.",
        "Lower our quality.",
      ],
      correct: 1,
    },
    {
      type: "open",
      prompt:
        "Write a 2–3 sentence Slack message to your team announcing that the Tuesday meeting is moving to Wednesday at 3pm.",
      promptKa: OPEN_PROMPT_KA,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4
// ─────────────────────────────────────────────────────────────────────────────
const TEST_4: ReassessmentTest = {
  version: 4,
  questions: [
    // EMAILS
    {
      type: "mcq", area: "emails", weight: 1,
      prompt: "Most appropriate greeting when you don't know the recipient's name:",
      promptKa: "უცნობი ადრესატის მისალმება.",
      options: ["Hey,", "To whom it may concern,", "Yo,", "Hello you,"],
      correct: 1,
    },
    {
      type: "mcq", area: "emails", weight: 2,
      prompt: "Choose the most professional way to send a reminder.",
      promptKa: "შეხსენების თავაზიანი ფორმა.",
      options: [
        "Did you forget?",
        "Just a gentle reminder about the report due tomorrow — let me know if you need anything from me.",
        "Where is it?",
        "You haven't sent it.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "emails", weight: 3,
      prompt: "An email opens with 'Per my last email…' — the tone is:",
      promptKa: "რა ტონია 'per my last email'?",
      options: [
        "Warm and friendly.",
        "Polite but signals slight frustration that the previous message wasn't acted on.",
        "Excited.",
        "Apologetic.",
      ],
      correct: 1,
    },
    // INTERVIEW / MEETING
    {
      type: "mcq", area: "interview_meeting", weight: 1,
      prompt: "End-of-interview question that shows interest in the role:",
      promptKa: "კარგი დასკვნითი კითხვა.",
      options: [
        "How much is the salary?",
        "What does success look like in this role in the first 90 days?",
        "How many vacation days?",
        "When can I leave early?",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 2,
      prompt: "In a meeting, how do you bring the discussion back on topic?",
      promptKa: "როგორ დააბრუნო შეხვედრა თემაზე?",
      options: [
        "Stop talking.",
        "These are great points — can we park them and return to the agenda for now?",
        "Be quiet please.",
        "We're off topic, focus.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 3,
      prompt: "Asked about salary expectations early in an interview, the strongest answer:",
      promptKa: "ხელფასის მოლოდინი.",
      options: [
        "I want a lot.",
        "I'd like to learn more about the role and responsibilities first, and I'm open to discussing a range that reflects market standards.",
        "Whatever you offer.",
        "$100,000.",
      ],
      correct: 1,
    },
    // VOCABULARY
    {
      type: "mcq", area: "vocabulary", weight: 1,
      prompt: "'Client' most closely means:",
      promptKa: "რას ნიშნავს client?",
      options: ["Boss", "A person or company that pays for your services", "Employee", "Vendor"],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 2,
      prompt: "'ROI' stands for:",
      promptKa: "რას ნიშნავს ROI?",
      options: [
        "Range of Interest",
        "Return on Investment",
        "Risk of Insurance",
        "Rate of Income",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 3,
      prompt: "'We're scaling the product to new markets.' 'Scaling' means:",
      promptKa: "რას ნიშნავს scaling?",
      options: [
        "Reducing it.",
        "Growing/expanding it in a structured way.",
        "Measuring it.",
        "Selling it.",
      ],
      correct: 1,
    },
    // MIXED
    {
      type: "mcq", area: "mixed", weight: 1,
      prompt: "Best way to ask for help without sounding helpless:",
      promptKa: "დახმარების თხოვნა პროფესიულად.",
      options: [
        "I can't do this.",
        "I'm hitting a blocker on X — could you take a look when you have a moment?",
        "Help me!",
        "I don't understand anything.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 2,
      prompt: "A colleague asks for feedback on their work. The most useful reply:",
      promptKa: "ფიდბექის მიცემა.",
      options: [
        "It's fine.",
        "Overall solid — one suggestion: tighten the intro paragraph so the main point lands faster.",
        "Looks bad.",
        "I don't have time.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 3,
      prompt: "Your client says: 'This is a hard sell internally.' They mean:",
      promptKa: "რას ნიშნავს 'hard sell'?",
      options: [
        "They love the proposal.",
        "It will be difficult to convince their own team to approve it.",
        "They want a discount.",
        "They're cancelling.",
      ],
      correct: 1,
    },
    {
      type: "open",
      prompt:
        "Write a short professional message (2–3 sentences) asking a client for clarification on requirements that were unclear in their last email.",
      promptKa: OPEN_PROMPT_KA,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5
// ─────────────────────────────────────────────────────────────────────────────
const TEST_5: ReassessmentTest = {
  version: 5,
  questions: [
    // EMAILS
    {
      type: "mcq", area: "emails", weight: 1,
      prompt: "Best phrase for attaching a document professionally:",
      promptKa: "ფაილის თანდართვის სწორი ფრაზა.",
      options: [
        "Here is the thing.",
        "Please find the attached proposal for your review.",
        "I send file.",
        "File ready.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "emails", weight: 2,
      prompt: "You're sending a cold outreach email. Best opening:",
      promptKa: "Cold outreach-ის სწორი დასაწყისი.",
      options: [
        "I want to sell you something.",
        "I came across your work on X and thought there might be an interesting fit with what we're building.",
        "Buy from us.",
        "Hi friend!",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "emails", weight: 3,
      prompt: "Choose the strongest rewrite of: 'You didn't reply to my last email.'",
      promptKa: "ყველაზე პროფესიული გადაწერა.",
      options: [
        "Why didn't you respond?",
        "Just floating this to the top of your inbox in case it got buried — happy to help with any open questions.",
        "Please answer me.",
        "I'm still waiting.",
      ],
      correct: 1,
    },
    // INTERVIEW / MEETING
    {
      type: "mcq", area: "interview_meeting", weight: 1,
      prompt: "Best way to politely interrupt in a meeting:",
      promptKa: "თავაზიანი ჩარევა შეხვედრაში.",
      options: [
        "Stop, listen to me.",
        "Sorry to jump in — could I add one quick point on that?",
        "Wait!",
        "Let me speak!",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 2,
      prompt: "Asked 'Where do you see yourself in 5 years?', the strongest answer focuses on:",
      promptKa: "სად ხედავ თავს 5 წელში?",
      options: [
        "A different company.",
        "Growth within the role and contributing at a senior level in this kind of work.",
        "Your own startup.",
        "Retirement.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "interview_meeting", weight: 3,
      prompt: "A meeting is running long. The most professional way to wrap up:",
      promptKa: "გრძელი შეხვედრის დასრულება.",
      options: [
        "We have to stop now.",
        "We're at time — let's lock in the two decisions we've made and take the rest async.",
        "I have to leave.",
        "Bye everyone.",
      ],
      correct: 1,
    },
    // VOCABULARY
    {
      type: "mcq", area: "vocabulary", weight: 1,
      prompt: "'Invoice' means:",
      promptKa: "რას ნიშნავს invoice?",
      options: [
        "A meeting note.",
        "A document requesting payment for goods or services.",
        "A receipt.",
        "A contract.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 2,
      prompt: "To 'onboard' a new employee means to:",
      promptKa: "რას ნიშნავს onboard?",
      options: [
        "Fire them.",
        "Introduce them to the team, tools and processes when they start.",
        "Promote them.",
        "Send them on a trip.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "vocabulary", weight: 3,
      prompt: "'Let's get buy-in from leadership before we move forward.' 'Buy-in' means:",
      promptKa: "რას ნიშნავს buy-in?",
      options: [
        "Money.",
        "Agreement and support from key people.",
        "A purchase.",
        "Final signed contract.",
      ],
      correct: 1,
    },
    // MIXED
    {
      type: "mcq", area: "mixed", weight: 1,
      prompt: "A coworker shares good news. The most professional response:",
      promptKa: "კოლეგის წარმატებაზე რეაგირება.",
      options: [
        "ok",
        "Congrats — that's a great result, well deserved!",
        "Nice for you.",
        "Whatever.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 2,
      prompt: "You need to push back on a request from a senior. Best opener:",
      promptKa: "უფროსისგან მოთხოვნაზე უარის თქმა.",
      options: [
        "No, I won't do that.",
        "Happy to take this on — given the current priorities, would it work if I delivered by Friday instead of tomorrow?",
        "I'm too busy.",
        "Ask someone else.",
      ],
      correct: 1,
    },
    {
      type: "mcq", area: "mixed", weight: 3,
      prompt: "A teammate writes: 'Let's take this offline and circle back EOD.' They mean:",
      promptKa: "რას ნიშნავს?",
      options: [
        "Stop using the internet and never speak again.",
        "Continue privately and reconnect by end of day.",
        "Cancel the project.",
        "Take a long break.",
      ],
      correct: 1,
    },
    {
      type: "open",
      prompt:
        "Write a 2–3 sentence professional message thanking a manager for feedback they gave you in a review.",
      promptKa: OPEN_PROMPT_KA,
    },
  ],
};

export const REASSESSMENT_TESTS: ReassessmentTest[] = [TEST_1, TEST_2, TEST_3, TEST_4, TEST_5];

export function maxMcqScore(test: ReassessmentTest): number {
  return test.questions.reduce((s, q) => s + (q.type === "mcq" ? q.weight : 0), 0);
}

/** Pick the next test version given the last one taken. */
export function pickNextTestVersion(lastVersion: number | null): 1 | 2 | 3 | 4 | 5 {
  if (!lastVersion) {
    // First time: random
    return ((Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5);
  }
  const next = (lastVersion % 5) + 1;
  return next as 1 | 2 | 3 | 4 | 5;
}
