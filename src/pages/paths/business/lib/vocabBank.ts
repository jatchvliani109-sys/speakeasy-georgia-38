// src/pages/paths/business/lib/vocabContext.ts
// -----------------------------------------------------------------------------
// CONTEXT LAYER for the Business Vocabulary bank (vocab-first).
//
// Pre-generated ONCE and bundled statically -> ZERO ongoing AI / API cost.
// For each word it adds: extra business example sentences + natural collocations.
// Words are grouped into situational CLUSTERS so they are taught together, in a
// realistic scene, instead of as an isolated flashcard.
//
// This file is ADDITIVE. It never modifies vocabBank.ts. Every `key` below
// matches a VocabWord.key in vocabBank.ts (verified programmatically against
// all 990 bank keys before every delivery). cluster.paragraphEn/Ka are also the
// raw material for the context-cloze question type in phase #2.
// -----------------------------------------------------------------------------

export type ContextExample = { en: string; ka: string };
export type Collocation = { en: string; ka: string };

export type WordContext = {
  /** Must equal a VocabWord.key in vocabBank.ts */
  key: string;
  /** Extra business example sentences, beyond the 1-2 already in the bank */
  examples: ContextExample[];
  /** Natural word-partners (how the word actually gets used at work) */
  collocations: Collocation[];
};

export type SituationCluster = {
  id: string;
  titleEn: string;
  titleKa: string;
  /** Georgian framing that sets the business scene for this cluster */
  scenarioKa: string;
  /** Bank keys taught together in this situation */
  wordKeys: string[];
  /** Realistic scene using several of the cluster's words */
  paragraphEn: string;
  /** Georgian translation; also the source text for context-cloze (phase #2) */
  paragraphKa: string;
};

// ---- Per-word context, keyed by the bank's word key ----
export const WORD_CONTEXT: Record<string, WordContext> = {

  "meeting": {
    key: "meeting",
    examples: [
      { en: "Let's keep the meeting to thirty minutes.", ka: "შეხვედრა ოცდაათ წუთში მოვათავსოთ." },
      { en: "I'll set up a meeting with the client for Thursday.", ka: "ხუთშაბათს კლიენტთან შეხვედრას დავნიშნავ." },
    ],
    collocations: [
      { en: "set up a meeting", ka: "შეხვედრის დანიშვნა" },
      { en: "run a meeting", ka: "შეხვედრის წარმართვა" },
      { en: "wrap up a meeting", ka: "შეხვედრის დასრულება" },
    ],
  },
  "agenda-item": {
    key: "agenda-item",
    examples: [
      { en: "Can we add this as an agenda item?", ka: "შეგვიძლია ეს დღის წესრიგში დავამატოთ?" },
      { en: "The first agenda item is the budget.", ka: "დღის წესრიგის პირველი პუნქტი ბიუჯეტია." },
    ],
    collocations: [
      { en: "add an agenda item", ka: "დღის წესრიგში პუნქტის დამატება" },
      { en: "cover an agenda item", ka: "დღის წესრიგის პუნქტის განხილვა" },
    ],
  },
  "chair": {
    key: "chair",
    examples: [
      { en: "Who is going to chair today's meeting?", ka: "ვინ წაუძღვება დღევანდელ შეხვედრას?" },
      { en: "I'll chair the first half, then hand over to Nino.", ka: "პირველ ნახევარს მე წავუძღვები, მერე ნინოს გადავცემ." },
    ],
    collocations: [
      { en: "chair a meeting", ka: "შეხვედრის თავმჯდომარეობა" },
      { en: "chair a session", ka: "სესიის წაძღოლა" },
    ],
  },
  "minute-taker": {
    key: "minute-taker",
    examples: [
      { en: "Could you take the minutes today?", ka: "დღეს ოქმის წარმოებას თუ იკისრებ?" },
      { en: "The minute-taker will share notes after the call.", ka: "ოქმის წარმოებაზე პასუხისმგებელი ზარის შემდეგ ჩანაწერებს გაგზავნის." },
    ],
    collocations: [
      { en: "take the minutes", ka: "ოქმის წარმოება" },
      { en: "assign a minute-taker", ka: "ოქმის წარმოებაზე პასუხისმგებლის დანიშვნა" },
    ],
  },
  "action-item": {
    key: "action-item",
    examples: [
      { en: "Let's capture the action items before we finish.", ka: "დასრულებამდე სამოქმედო პუნქტები ჩავიწეროთ." },
      { en: "Each action item needs an owner and a due date.", ka: "ყოველ სამოქმედო პუნქტს სჭირდება პასუხისმგებელი და ვადა." },
    ],
    collocations: [
      { en: "capture action items", ka: "სამოქმედო პუნქტების ჩაწერა" },
      { en: "assign an action item", ka: "სამოქმედო პუნქტის მიკუთვნება" },
    ],
  },
  "next-steps": {
    key: "next-steps",
    examples: [
      { en: "Let's agree on the next steps.", ka: "მოდი შემდეგ ნაბიჯებზე შევთანხმდეთ." },
      { en: "I'll email the next steps to everyone.", ka: "შემდეგ ნაბიჯებს ყველას იმეილით გავუგზავნი." },
    ],
    collocations: [
      { en: "agree on next steps", ka: "შემდეგ ნაბიჯებზე შეთანხმება" },
      { en: "outline next steps", ka: "შემდეგი ნაბიჯების გამოკვეთა" },
    ],
  },
  "recap": {
    key: "recap",
    examples: [
      { en: "Let me give a quick recap of what we decided.", ka: "მოკლედ შევაჯამებ იმას, რაც გადავწყვიტეთ." },
      { en: "Thanks for the recap — that's clear now.", ka: "მადლობა შეჯამებისთვის — ახლა ნათელია." },
    ],
    collocations: [
      { en: "give a recap", ka: "შეჯამების გაკეთება" },
      { en: "quick recap", ka: "სწრაფი შეჯამება" },
    ],
  },
  "postpone": {
    key: "postpone",
    examples: [
      { en: "We may need to postpone the review until next week.", ka: "შესაძლოა განხილვა მომავალ კვირამდე გადავდოთ." },
      { en: "They postponed the launch by a month.", ka: "გაშვება ერთი თვით გადადეს." },
    ],
    collocations: [
      { en: "postpone a meeting", ka: "შეხვედრის გადადება" },
      { en: "postpone a decision", ka: "გადაწყვეტილების გადადება" },
    ],
  },
  "update": {
    key: "update",
    examples: [
      { en: "Here's a quick update on the project.", ka: "აი პროექტის მოკლე განახლება." },
      { en: "I'll send you an update by end of day.", ka: "დღის ბოლომდე განახლებას გამოგიგზავნი." },
    ],
    collocations: [
      { en: "send an update", ka: "განახლების გაგზავნა" },
      { en: "quick update", ka: "სწრაფი განახლება" },
    ],
  },
  "status": {
    key: "status",
    examples: [
      { en: "What's the status of the report?", ka: "ანგარიშის სტატუსი რა არის?" },
      { en: "The status is green — we're on track.", ka: "სტატუსი მწვანეა — გრაფიკში ვართ." },
    ],
    collocations: [
      { en: "check the status", ka: "სტატუსის შემოწმება" },
      { en: "status update", ka: "სტატუსის განახლება" },
    ],
  },
  "progress": {
    key: "progress",
    examples: [
      { en: "We've made good progress this week.", ka: "ამ კვირაში კარგი პროგრესი გვქონდა." },
      { en: "Progress is slower than expected.", ka: "პროგრესი მოსალოდნელზე ნელია." },
    ],
    collocations: [
      { en: "make progress", ka: "პროგრესის მიღწევა" },
      { en: "track progress", ka: "პროგრესის თვალყურის დევნება" },
    ],
  },
  "milestone": {
    key: "milestone",
    examples: [
      { en: "We just hit an important milestone.", ka: "ახლახან მნიშვნელოვან ეტაპს მივაღწიეთ." },
      { en: "The next milestone is the beta release.", ka: "შემდეგი ეტაპი ბეტა-ვერსიის გაშვებაა." },
    ],
    collocations: [
      { en: "hit a milestone", ka: "ეტაპის მიღწევა" },
      { en: "key milestone", ka: "მნიშვნელოვანი ეტაპი" },
    ],
  },
  "priority": {
    key: "priority",
    examples: [
      { en: "This is our top priority right now.", ka: "ეს ახლა ჩვენი მთავარი პრიორიტეტია." },
      { en: "Let's set priorities for the week.", ka: "მოდი კვირის პრიორიტეტები დავსახოთ." },
    ],
    collocations: [
      { en: "top priority", ka: "მთავარი პრიორიტეტი" },
      { en: "set priorities", ka: "პრიორიტეტების დასახვა" },
    ],
  },
  "blocker": {
    key: "blocker",
    examples: [
      { en: "I have one blocker — I'm waiting on the design.", ka: "ერთი შემაფერხებელი მაქვს — დიზაინს ველოდები." },
      { en: "Let's clear this blocker today.", ka: "მოდი ეს შემაფერხებელი დღეს მოვხსნათ." },
    ],
    collocations: [
      { en: "hit a blocker", ka: "შემაფერხებელზე წაწყდომა" },
      { en: "remove a blocker", ka: "შემაფერხებლის მოხსნა" },
    ],
  },
  "pending": {
    key: "pending",
    examples: [
      { en: "The approval is still pending.", ka: "დამტკიცება ჯერ კიდევ მოლოდინშია." },
      { en: "Two tasks are pending your review.", ka: "ორი დავალება შენს გადახედვას ელოდება." },
    ],
    collocations: [
      { en: "pending approval", ka: "დამტკიცების მოლოდინში" },
      { en: "still pending", ka: "ჯერ კიდევ მოლოდინში" },
    ],
  },
  "overdue": {
    key: "overdue",
    examples: [
      { en: "The invoice is two weeks overdue.", ka: "ინვოისი ორი კვირით ვადაგადაცილებულია." },
      { en: "This task is overdue — let's prioritize it.", ka: "ეს დავალება ვადაგადაცილებულია — მოდი პრიორიტეტი მივანიჭოთ." },
    ],
    collocations: [
      { en: "overdue task", ka: "ვადაგადაცილებული დავალება" },
      { en: "become overdue", ka: "ვადის გადაცილება" },
    ],
  },
  "subject": {
    key: "subject",
    examples: [
      { en: "What should I put in the subject line?", ka: "თემის ველში რა ჩავწერო?" },
      { en: "The subject says it's about the invoice.", ka: "თემაში წერია, რომ ინვოისს ეხება." },
    ],
    collocations: [
      { en: "clear subject line", ka: "მკაფიო თემა" },
      { en: "change the subject line", ka: "თემის შეცვლა" },
    ],
  },
  "draft": {
    key: "draft",
    examples: [
      { en: "I saved the email as a draft.", ka: "იმეილი მონახაზად შევინახე." },
      { en: "Can you review my draft before I send it?", ka: "გაგზავნამდე ჩემს მონახაზს გადახედავ?" },
    ],
    collocations: [
      { en: "write a draft", ka: "მონახაზის დაწერა" },
      { en: "first draft", ka: "პირველი ვერსია" },
    ],
  },
  "attach": {
    key: "attach",
    examples: [
      { en: "I forgot to attach the report — here it is.", ka: "ანგარიშის მიმაგრება დამავიწყდა — აი, ახლა." },
      { en: "Please attach your resume to the email.", ka: "გთხოვ, რეზიუმე იმეილს მიამაგრე." },
    ],
    collocations: [
      { en: "attach a file", ka: "ფაილის მიმაგრება" },
      { en: "attach a document", ka: "დოკუმენტის მიმაგრება" },
    ],
  },
  "reply": {
    key: "reply",
    examples: [
      { en: "Sorry for the late reply.", ka: "ბოდიში დაგვიანებული პასუხისთვის." },
      { en: "Please reply to everyone on the thread.", ka: "გთხოვ, მიმოწერაში ყველას უპასუხე." },
    ],
    collocations: [
      { en: "reply all", ka: "ყველასთვის პასუხი" },
      { en: "late reply", ka: "დაგვიანებული პასუხი" },
    ],
  },
  "forward": {
    key: "forward",
    examples: [
      { en: "Could you forward me the invitation?", ka: "მოსაწვევს გადმომიგზავნი?" },
      { en: "I forwarded your email to the finance team.", ka: "შენი იმეილი ფინანსურ გუნდს გადავუგზავნე." },
    ],
    collocations: [
      { en: "forward an email", ka: "იმეილის გადაგზავნა" },
      { en: "forward to a colleague", ka: "კოლეგასთვის გადაგზავნა" },
    ],
  },
  "cc": {
    key: "cc",
    examples: [
      { en: "Please CC me on all client emails.", ka: "გთხოვ, კლიენტის ყველა იმეილში ღია ასლში დამამატე." },
      { en: "I added your manager in CC.", ka: "შენი მენეჯერი ღია ასლში დავამატე." },
    ],
    collocations: [
      { en: "CC someone", ka: "ვინმეს ღია ასლში დამატება" },
      { en: "keep me in CC", ka: "ღია ასლში დამტოვე" },
    ],
  },
  "bcc": {
    key: "bcc",
    examples: [
      { en: "Use BCC when emailing a large group.", ka: "დიდ ჯგუფთან მიმოწერისას ფარული ასლი გამოიყენე." },
      { en: "The list was in BCC, so the addresses stayed private.", ka: "სია ფარულ ასლში იყო, ამიტომ მისამართები დაფარული დარჩა." },
    ],
    collocations: [
      { en: "add in BCC", ka: "ფარულ ასლში დამატება" },
      { en: "send via BCC", ka: "ფარული ასლით გაგზავნა" },
    ],
  },
  "follow-up": {
    key: "follow-up",
    examples: [
      { en: "This is a quick follow-up on yesterday's call.", ka: "ეს გუშინდელი ზარის მოკლე შეხსენებაა." },
      { en: "I'll send a follow-up if they don't answer by Friday.", ka: "თუ პარასკევამდე არ მიპასუხეს, შეხსენებას გავუგზავნი." },
    ],
    collocations: [
      { en: "send a follow-up", ka: "შეხსენების გაგზავნა" },
      { en: "follow up on an email", ka: "იმეილზე შეხსენება" },
    ],
  },
  "inbox": {
    key: "inbox",
    examples: [
      { en: "Your message got buried in my inbox.", ka: "შენი შეტყობინება ინბოქსში ჩამეკარგა." },
      { en: "I check my inbox first thing every morning.", ka: "ყოველ დილით პირველ რიგში ინბოქსს ვამოწმებ." },
    ],
    collocations: [
      { en: "check the inbox", ka: "ინბოქსის შემოწმება" },
      { en: "empty inbox", ka: "ცარიელი ინბოქსი" },
    ],
  },
  "deadline": {
    key: "deadline",
    examples: [
      { en: "The deadline for feedback is Tuesday.", ka: "უკუკავშირის ბოლო ვადა სამშაბათია." },
      { en: "We're working against a tight deadline.", ka: "მჭიდრო ვადაში ვმუშაობთ." },
    ],
    collocations: [
      { en: "meet a deadline", ka: "ვადის დაცვა" },
      { en: "miss a deadline", ka: "ვადის გადაცილება" },
      { en: "tight deadline", ka: "მჭიდრო ვადა" },
    ],
  },
  "reschedule": {
    key: "reschedule",
    examples: [
      { en: "Let's reschedule the demo for next week.", ka: "დემო მომავალ კვირაზე გადავიტანოთ." },
      { en: "The client asked to reschedule twice.", ka: "კლიენტმა ორჯერ ითხოვა გადატანა." },
    ],
    collocations: [
      { en: "reschedule a meeting", ka: "შეხვედრის გადატანა" },
      { en: "reschedule for later", ka: "მოგვიანებით გადატანა" },
    ],
  },
  "cancel": {
    key: "cancel",
    examples: [
      { en: "I'm afraid we have to cancel tomorrow's session.", ka: "სამწუხაროდ, ხვალინდელი სესია უნდა გავაუქმოთ." },
      { en: "They canceled at the last minute.", ka: "ბოლო წუთს გააუქმეს." },
    ],
    collocations: [
      { en: "cancel a meeting", ka: "შეხვედრის გაუქმება" },
      { en: "cancel last minute", ka: "ბოლო წუთს გაუქმება" },
    ],
  },
  "confirm": {
    key: "confirm",
    examples: [
      { en: "Can you confirm the time works for you?", ka: "დამიდასტურებ, რომ დრო გაწყობს?" },
      { en: "I'm writing to confirm our appointment.", ka: "გწერ, რომ ჩვენი შეხვედრა დავადასტურო." },
    ],
    collocations: [
      { en: "confirm attendance", ka: "დასწრების დადასტურება" },
      { en: "confirm a time", ka: "დროის დადასტურება" },
    ],
  },
  "availability": {
    key: "availability",
    examples: [
      { en: "What's your availability this week?", ka: "ამ კვირაში როდის გაქვს თავისუფალი დრო?" },
      { en: "Please send your availability for Thursday and Friday.", ka: "გთხოვ, ხუთშაბათსა და პარასკევს შენი თავისუფალი დროები გამომიგზავნე." },
    ],
    collocations: [
      { en: "share availability", ka: "თავისუფალი დროის გაზიარება" },
      { en: "check availability", ka: "ხელმისაწვდომობის შემოწმება" },
    ],
  },
  "urgent": {
    key: "urgent",
    examples: [
      { en: "This is urgent — can we talk today?", ka: "გადაუდებელია — დღეს ვისაუბროთ?" },
      { en: "Mark the ticket as urgent.", ka: "თიქეთი გადაუდებლად მონიშნე." },
    ],
    collocations: [
      { en: "urgent request", ka: "გადაუდებელი მოთხოვნა" },
      { en: "mark as urgent", ka: "გადაუდებლად მონიშვნა" },
    ],
  },
  "asap": {
    key: "asap",
    examples: [
      { en: "We need the signed contract ASAP.", ka: "ხელმოწერილი კონტრაქტი რაც შეიძლება მალე გვჭირდება." },
      { en: "I'll get back to you ASAP.", ka: "რაც შეიძლება მალე დაგიბრუნდები." },
    ],
    collocations: [
      { en: "need it ASAP", ka: "სასწრაფოდ სჭირდება" },
      { en: "get back ASAP", ka: "რაც შეიძლება მალე პასუხის დაბრუნება" },
    ],
  },
  "eod": {
    key: "eod",
    examples: [
      { en: "I'll have the numbers ready by EOD.", ka: "ციფრები დღის ბოლომდე მექნება მზად." },
      { en: "Can you share the draft by EOD Thursday?", ka: "მონახაზს ხუთშაბათის ბოლომდე გამიზიარებ?" },
    ],
    collocations: [
      { en: "by EOD", ka: "დღის ბოლომდე" },
      { en: "EOD deadline", ka: "დღის ბოლოს ვადა" },
    ],
  },
  "buffer": {
    key: "buffer",
    examples: [
      { en: "Let's build in a buffer before the launch.", ka: "გაშვებამდე სარეზერვო დრო ჩავდოთ." },
      { en: "There's no buffer left in the schedule.", ka: "განრიგში სარეზერვო დრო აღარ დარჩა." },
    ],
    collocations: [
      { en: "add a buffer", ka: "სარეზერვო დროის დამატება" },
      { en: "buffer time", ka: "სარეზერვო დრო" },
    ],
  },
};


// ---- Situational clusters ----
export const SITUATION_CLUSTERS: SituationCluster[] = [
  {
    id: "running-a-meeting",
    titleEn: "Running a meeting",
    titleKa: "შეხვედრის გაძღოლა",
    scenarioKa: "წარმოიდგინე, რომ დღეს შენ უძღვები გუნდის შეხვედრას — ხსნი დღის წესრიგს, ინაწილებ დავალებებს და აჯამებ შედეგებს.",
    wordKeys: ["meeting", "agenda-item", "chair", "minute-taker", "action-item", "next-steps", "recap", "postpone"],
    paragraphEn: "Nino is chairing today's team meeting. She opens with the agenda: three items, starting with the budget. Giorgi agrees to take the minutes. Halfway through, they decide to postpone the last item until next week. Before they wrap up, Nino captures the action items, assigns an owner to each, and gives a quick recap of the next steps.",
    paragraphKa: "ნინო დღეს გუნდის შეხვედრას უძღვება. ის იწყებს დღის წესრიგით: სამი პუნქტი, ბიუჯეტიდან. გიორგი თანხმდება, რომ ოქმს აწარმოებს. შუა გზაზე გადაწყვეტენ, რომ ბოლო პუნქტს მომავალ კვირამდე გადადებენ. დასრულებამდე ნინო ჩაიწერს სამოქმედო პუნქტებს, თითოეულს პასუხისმგებელს მიუჩენს და მოკლედ შეაჯამებს შემდეგ ნაბიჯებს.",
  },
  {
    id: "status-update",
    titleEn: "Giving a status update",
    titleKa: "სტატუსის განახლება",
    scenarioKa: "წარმოიდგინე, რომ მენეჯერს პროექტის მიმდინარეობას აცნობებ — რა დასრულდა, სად ხარ ახლა და რა გაფერხებს წინსვლას.",
    wordKeys: ["update", "status", "progress", "milestone", "priority", "blocker", "pending", "overdue"],
    paragraphEn: "Time for the weekly status update. Overall, we've made solid progress and hit our first milestone on schedule. The status is green. My top priority now is the payment integration. There's one blocker — the vendor's API is delayed — so that piece is still pending. One task is already overdue, and I'll clear it first.",
    paragraphKa: "ყოველკვირეული სტატუსის განახლების დროა. საერთო ჯამში, კარგი პროგრესი გვქონდა და პირველ ეტაპს გრაფიკში მივაღწიეთ. სტატუსი მწვანეა. ჩემი მთავარი პრიორიტეტი ახლა გადახდის ინტეგრაციაა. ერთი შემაფერხებელია — მომწოდებლის API დაგვიანებულია — ამიტომ ეს ნაწილი ჯერ კიდევ მოლოდინშია. ერთი დავალება უკვე ვადაგადაცილებულია და ჯერ მას მოვაგვარებ.",
  },
  {
    id: "emails-and-messaging",
    titleEn: "Emails & messaging",
    titleKa: "იმეილები და მიმოწერა",
    scenarioKa: "წარმოიდგინე, რომ კლიენტს პასუხი არ მოუწერია და საქმიან, თავაზიან შემახსენებელ იმეილს წერ.",
    wordKeys: ["subject", "draft", "attach", "reply", "forward", "cc", "bcc", "follow-up", "inbox"],
    paragraphEn: "Giorgi opens his inbox and sees there's still no reply from the client, so he writes a short follow-up. He keeps the subject line clear, attaches the updated proposal, and adds his manager in CC. Before sending, he saves the email as a draft and reads it one more time. Then he forwards a copy to the finance team as well.",
    paragraphKa: "გიორგი ინბოქსს ხსნის და ხედავს, რომ კლიენტისგან პასუხი ისევ არ არის, ამიტომ მოკლე შეხსენებას წერს. თემას მკაფიოს ტოვებს, განახლებულ შეთავაზებას ამაგრებს და მენეჯერს ღია ასლში ამატებს. გაგზავნამდე იმეილს მონახაზად ინახავს და კიდევ ერთხელ გადაიკითხავს. ბოლოს ასლს ფინანსურ გუნდსაც უგზავნის.",
  },
  {
    id: "deadlines-and-scheduling",
    titleEn: "Deadlines & scheduling",
    titleKa: "ვადები და განრიგი",
    scenarioKa: "წარმოიდგინე, რომ კვირის განრიგი ირევა — შეხვედრების გადატანა, დროების დადასტურება და ვადების დაცვა შენზეა.",
    wordKeys: ["deadline", "reschedule", "cancel", "confirm", "availability", "urgent", "asap", "eod", "buffer"],
    paragraphEn: "The client asks to reschedule Friday's review, but the deadline can't move. Ana checks the team's availability and confirms a new time for Thursday morning. She marks the invite as urgent and asks everyone to respond by EOD. One workshop gets canceled to free up time, and she adds a small buffer before the final review — in case anything needs fixing ASAP.",
    paragraphKa: "კლიენტი პარასკევის განხილვის გადატანას ითხოვს, მაგრამ ბოლო ვადა ვერ იცვლება. ანა გუნდის თავისუფალ დროებს ამოწმებს და ხუთშაბათ დილისთვის ახალ დროს ადასტურებს. მოსაწვევს გადაუდებლად ნიშნავს და ყველას სთხოვს, დღის ბოლომდე უპასუხონ. დროის გასათავისუფლებლად ერთი ვორქშოფი უქმდება, ხოლო საბოლოო განხილვამდე მცირე სარეზერვო დროს ამატებს — თუ რამის სასწრაფოდ გასწორება დასჭირდებათ.",
  },
];


// ---- Accessors ----
export function getContext(key: string): WordContext | undefined {
  return WORD_CONTEXT[key];
}

/** The situational cluster a word belongs to (if any). */
export function clusterFor(key: string): SituationCluster | undefined {
  return SITUATION_CLUSTERS.find((c) => c.wordKeys.includes(key));
}

export function clusterById(id: string): SituationCluster | undefined {
  return SITUATION_CLUSTERS.find((c) => c.id === id);
}

/** All word keys that currently have a context entry. */
export function allContextKeys(): string[] {
  return Object.keys(WORD_CONTEXT);
}