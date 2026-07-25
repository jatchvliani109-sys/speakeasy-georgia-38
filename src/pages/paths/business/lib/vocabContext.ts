// src/pages/paths/business/lib/vocabContext.ts
// -----------------------------------------------------------------------------
// CONTEXT LAYER v2 for the Business Vocabulary bank — now the SCENARIO system.
//
// Pre-generated ONCE and bundled statically -> ZERO ongoing AI / API cost.
// Per word: extra business examples + natural collocations.
// Per cluster (scenario): a category, a Georgian scene setup, a realistic
// business paragraph (source for context-cloze questions), and a short
// EN+KA dialogue that shows the words used in live conversation.
//
// This file is ADDITIVE. It never modifies vocabBank.ts. Every `key` matches a
// VocabWord.key in vocabBank.ts (verified programmatically against all 990
// bank keys before every delivery).
// -----------------------------------------------------------------------------

export type ContextExample = { en: string; ka: string };
export type Collocation = { en: string; ka: string };
export type DialogueLine = { speaker: string; en: string; ka: string };

export type ScenarioCategory =
  | "meetings"
  | "status"
  | "emails"
  | "scheduling"
  | "negotiation"
  | "feedback"
  | "interview"
  | "presentations";

export const CATEGORY_LABELS_KA: Record<ScenarioCategory, string> = {
  meetings: "შეხვედრები",
  status: "სტატუსი და ანგარიშგება",
  emails: "იმეილები",
  scheduling: "ვადები და განრიგი",
  negotiation: "მოლაპარაკება",
  feedback: "უკუკავშირი და შეფასება",
  interview: "გასაუბრება",
  presentations: "პრეზენტაციები",
};

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
  category: ScenarioCategory;
  /** Georgian framing that sets the business scene for this cluster */
  scenarioKa: string;
  /** Bank keys taught together in this situation */
  wordKeys: string[];
  /** Realistic scene using several of the cluster's words */
  paragraphEn: string;
  /** Georgian translation; also the source text for context-cloze questions */
  paragraphKa: string;
  /** Short realistic conversation using the cluster's words (EN + KA) */
  dialogue: DialogueLine[];
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
  "negotiate": {
    key: "negotiate",
    examples: [
      { en: "We're still negotiating the delivery terms.", ka: "მიწოდების პირობებზე ჯერ კიდევ ვმოლაპარაკობთ." },
      { en: "Everything is negotiable except the deadline.", ka: "ყველაფერი მოლაპარაკებადია, ბოლო ვადის გარდა." },
    ],
    collocations: [
      { en: "negotiate a price", ka: "ფასზე მოლაპარაკება" },
      { en: "negotiate a contract", ka: "კონტრაქტზე მოლაპარაკება" },
    ],
  },
  "offer": {
    key: "offer",
    examples: [
      { en: "They made us a generous offer.", ka: "გულუხვი შეთავაზება მოგვცეს." },
      { en: "The offer is valid until Friday.", ka: "შეთავაზება პარასკევამდე ძალაშია." },
    ],
    collocations: [
      { en: "make an offer", ka: "შეთავაზების გაკეთება" },
      { en: "accept an offer", ka: "შეთავაზების მიღება" },
      { en: "decline an offer", ka: "შეთავაზებაზე უარის თქმა" },
    ],
  },
  "counteroffer": {
    key: "counteroffer",
    examples: [
      { en: "We received their counteroffer this morning.", ka: "მათი საპასუხო შეთავაზება დღეს დილით მივიღეთ." },
      { en: "Our counteroffer includes faster delivery.", ka: "ჩვენი საპასუხო შეთავაზება უფრო სწრაფ მიწოდებას მოიცავს." },
    ],
    collocations: [
      { en: "make a counteroffer", ka: "საპასუხო შეთავაზების გაკეთება" },
      { en: "reject a counteroffer", ka: "საპასუხო შეთავაზების უარყოფა" },
    ],
  },
  "concession": {
    key: "concession",
    examples: [
      { en: "We can make one concession on price.", ka: "ფასში ერთი დათმობა შეგვიძლია." },
      { en: "Every concession should get something in return.", ka: "ყოველ დათმობას სანაცვლო უნდა მოჰყვეს." },
    ],
    collocations: [
      { en: "make a concession", ka: "დათმობაზე წასვლა" },
      { en: "mutual concessions", ka: "ორმხრივი დათმობები" },
    ],
  },
  "compromise": {
    key: "compromise",
    examples: [
      { en: "We reached a fair compromise on the timeline.", ka: "ვადებზე სამართლიან კომპრომისს მივაღწიეთ." },
      { en: "Neither side wanted to compromise on quality.", ka: "ხარისხზე კომპრომისი არც ერთ მხარეს არ სურდა." },
    ],
    collocations: [
      { en: "reach a compromise", ka: "კომპრომისის მიღწევა" },
      { en: "compromise on price", ka: "ფასზე კომპრომისი" },
    ],
  },
  "consensus": {
    key: "consensus",
    examples: [
      { en: "The board finally reached consensus.", ka: "საბჭომ ბოლოს კონსენსუსს მიაღწია." },
      { en: "There's no consensus yet on the budget.", ka: "ბიუჯეტზე კონსენსუსი ჯერ არ არის." },
    ],
    collocations: [
      { en: "reach consensus", ka: "კონსენსუსის მიღწევა" },
      { en: "build consensus", ka: "კონსენსუსის ჩამოყალიბება" },
    ],
  },
  "win-win": {
    key: "win-win",
    examples: [
      { en: "Let's look for a win-win solution.", ka: "ორმხრივად მომგებიანი გადაწყვეტა ვეძებოთ." },
      { en: "The partnership turned out to be a win-win.", ka: "პარტნიორობა ორმხრივად მომგებიანი აღმოჩნდა." },
    ],
    collocations: [
      { en: "win-win solution", ka: "ორმხრივად მომგებიანი გადაწყვეტა" },
      { en: "win-win outcome", ka: "ორმხრივად მომგებიანი შედეგი" },
    ],
  },
  "terms": {
    key: "terms",
    examples: [
      { en: "The terms of the contract are clear.", ka: "კონტრაქტის პირობები მკაფიოა." },
      { en: "We can be flexible on payment terms.", ka: "გადახდის პირობებში მოქნილები შეგვიძლია ვიყოთ." },
    ],
    collocations: [
      { en: "agree on terms", ka: "პირობებზე შეთანხმება" },
      { en: "favorable terms", ka: "ხელსაყრელი პირობები" },
    ],
  },
  "deal": {
    key: "deal",
    examples: [
      { en: "It took two months to close the deal.", ka: "გარიგების დახურვას ორი თვე დასჭირდა." },
      { en: "The deal fell through at the last moment.", ka: "გარიგება ბოლო მომენტში ჩაიშალა." },
    ],
    collocations: [
      { en: "close a deal", ka: "გარიგების დახურვა" },
      { en: "the deal falls through", ka: "გარიგების ჩაშლა" },
    ],
  },
  "feedback": {
    key: "feedback",
    examples: [
      { en: "Could I get some feedback on the draft?", ka: "მონახაზზე უკუკავშირს მომცემ?" },
      { en: "We collect feedback after every release.", ka: "ყოველი გაშვების შემდეგ უკუკავშირს ვაგროვებთ." },
    ],
    collocations: [
      { en: "give feedback", ka: "უკუკავშირის მიცემა" },
      { en: "ask for feedback", ka: "უკუკავშირის თხოვნა" },
    ],
  },
  "constructive": {
    key: "constructive",
    examples: [
      { en: "Her comments were tough but constructive.", ka: "მისი კომენტარები მკაცრი, მაგრამ კონსტრუქციული იყო." },
      { en: "Keep the discussion constructive, please.", ka: "გთხოვთ, დისკუსია კონსტრუქციული შეინარჩუნეთ." },
    ],
    collocations: [
      { en: "constructive criticism", ka: "კონსტრუქციული კრიტიკა" },
      { en: "constructive feedback", ka: "კონსტრუქციული უკუკავშირი" },
    ],
  },
  "peer-review": {
    key: "peer-review",
    examples: [
      { en: "The document goes to peer review before publishing.", ka: "დოკუმენტი გამოქვეყნებამდე კოლეგათა შეფასებაზე გადის." },
      { en: "Peer review caught two important mistakes.", ka: "კოლეგათა შეფასებამ ორი მნიშვნელოვანი შეცდომა აღმოაჩინა." },
    ],
    collocations: [
      { en: "go through peer review", ka: "კოლეგათა შეფასების გავლა" },
      { en: "peer-review process", ka: "კოლეგათა შეფასების პროცესი" },
    ],
  },
  "strength": {
    key: "strength",
    examples: [
      { en: "Communication is her biggest strength.", ka: "კომუნიკაცია მისი ყველაზე ძლიერი მხარეა." },
      { en: "Play to the team's strengths.", ka: "გუნდის ძლიერ მხარეებზე დააშენე." },
    ],
    collocations: [
      { en: "key strength", ka: "მთავარი ძლიერი მხარე" },
      { en: "build on strengths", ka: "ძლიერ მხარეებზე დაშენება" },
    ],
  },
  "weakness": {
    key: "weakness",
    examples: [
      { en: "Turn a weakness into a growth area.", ka: "სუსტი მხარე ზრდის სივრცედ აქციე." },
      { en: "The review pointed out one clear weakness.", ka: "შეფასებამ ერთი აშკარა სუსტი მხარე გამოკვეთა." },
    ],
    collocations: [
      { en: "identify weaknesses", ka: "სუსტი მხარეების გამოვლენა" },
      { en: "work on a weakness", ka: "სუსტ მხარეზე მუშაობა" },
    ],
  },
  "highlight": {
    key: "highlight",
    examples: [
      { en: "The report highlights three achievements.", ka: "ანგარიში სამ მიღწევას გამოკვეთს." },
      { en: "Let me highlight what went well first.", ka: "ჯერ ის გამოვკვეთო, რაც კარგად წავიდა." },
    ],
    collocations: [
      { en: "highlight achievements", ka: "მიღწევების გამოკვეთა" },
      { en: "highlight an issue", ka: "პრობლემის გამოკვეთა" },
    ],
  },
  "improve": {
    key: "improve",
    examples: [
      { en: "What could I improve for next time?", ka: "შემდეგისთვის რა გავაუმჯობესო?" },
      { en: "The response time improved a lot this quarter.", ka: "ამ კვარტალში რეაგირების დრო საგრძნობლად გაუმჯობესდა." },
    ],
    collocations: [
      { en: "improve performance", ka: "შედეგების გაუმჯობესება" },
      { en: "room to improve", ka: "გაუმჯობესების სივრცე" },
    ],
  },
  "one-on-one": {
    key: "one-on-one",
    examples: [
      { en: "Let's discuss this in our one-on-one.", ka: "ეს ჩვენს ერთი-ერთზე შეხვედრაზე განვიხილოთ." },
      { en: "She schedules a one-on-one with each team member monthly.", ka: "ის ყოველთვიურად ნიშნავს ერთი-ერთზე შეხვედრას გუნდის თითოეულ წევრთან." },
    ],
    collocations: [
      { en: "schedule a one-on-one", ka: "ერთი-ერთზე შეხვედრის დანიშვნა" },
      { en: "weekly one-on-one", ka: "ყოველკვირეული ერთი-ერთზე" },
    ],
  },
  "performance-review": {
    key: "performance-review",
    examples: [
      { en: "My performance review went better than expected.", ka: "ჩემი საქმიანობის შეფასება მოსალოდნელზე უკეთ ჩაიარა." },
      { en: "Set clear goals before the performance review.", ka: "საქმიანობის შეფასებამდე მკაფიო მიზნები დაისახე." },
    ],
    collocations: [
      { en: "annual performance review", ka: "წლიური საქმიანობის შეფასება" },
      { en: "prepare for a review", ka: "შეფასებისთვის მომზადება" },
    ],
  },
  "request": {
    key: "request",
    examples: [
      { en: "I'd like to request access to the shared folder.", ka: "საერთო საქაღალდეზე წვდომის მოთხოვნა მინდა." },
      { en: "We received your request and will process it today.", ka: "თქვენი მოთხოვნა მივიღეთ და დღესვე დავამუშავებთ." },
    ],
    collocations: [
      { en: "submit a request", ka: "მოთხოვნის წარდგენა" },
      { en: "polite request", ka: "თავაზიანი მოთხოვნა" },
      { en: "decline a request", ka: "მოთხოვნაზე უარის თქმა" },
    ],
  },
  "respond": {
    key: "respond",
    examples: [
      { en: "Please respond by Thursday.", ka: "გთხოვ, ხუთშაბათამდე უპასუხე." },
      { en: "They responded within an hour.", ka: "ერთ საათში გვიპასუხეს." },
    ],
    collocations: [
      { en: "respond promptly", ka: "სწრაფად პასუხის გაცემა" },
      { en: "respond to a request", ka: "მოთხოვნაზე პასუხის გაცემა" },
    ],
  },
  "attachment": {
    key: "attachment",
    examples: [
      { en: "The attachment didn't come through — could you resend it?", ka: "მიმაგრებული ფაილი არ ჩანს — ხელახლა ხომ ვერ გამოაგზავნი?" },
      { en: "See the attachment for full details.", ka: "სრული დეტალებისთვის იხილე მიმაგრებული ფაილი." },
    ],
    collocations: [
      { en: "open an attachment", ka: "მიმაგრებული ფაილის გახსნა" },
      { en: "forget the attachment", ka: "მიმაგრებული ფაილის დავიწყება" },
    ],
  },
  "submit": {
    key: "submit",
    examples: [
      { en: "Submit the form before the deadline.", ka: "ფორმა ბოლო ვადამდე წარადგინე." },
      { en: "All reports must be submitted by EOD Friday.", ka: "ყველა ანგარიში პარასკევის ბოლომდე უნდა იყოს წარდგენილი." },
    ],
    collocations: [
      { en: "submit a report", ka: "ანგარიშის წარდგენა" },
      { en: "submit on time", ka: "დროულად წარდგენა" },
    ],
  },
  "clarify": {
    key: "clarify",
    examples: [
      { en: "Could you clarify the second point?", ka: "მეორე პუნქტს ხომ ვერ დააზუსტებ?" },
      { en: "Just to clarify — the meeting is online, right?", ka: "დასაზუსტებლად — შეხვედრა ონლაინ არის, ხომ?" },
    ],
    collocations: [
      { en: "clarify a point", ka: "საკითხის დაზუსტება" },
      { en: "happy to clarify", ka: "სიამოვნებით დავაზუსტებ" },
    ],
  },
  "apologize": {
    key: "apologize",
    examples: [
      { en: "I apologize for the late response.", ka: "ბოდიშს ვიხდი დაგვიანებული პასუხისთვის." },
      { en: "We apologize for any inconvenience.", ka: "ბოდიშს ვიხდით შეფერხებისთვის." },
    ],
    collocations: [
      { en: "apologize for a delay", ka: "დაგვიანებისთვის ბოდიშის მოხდა" },
      { en: "sincerely apologize", ka: "გულწრფელად ბოდიშის მოხდა" },
    ],
  },
  "formal": {
    key: "formal",
    examples: [
      { en: "Use a formal tone with new clients.", ka: "ახალ კლიენტებთან ოფიციალური ტონი გამოიყენე." },
      { en: "This needs a formal written confirmation.", ka: "ამას ოფიციალური წერილობითი დადასტურება სჭირდება." },
    ],
    collocations: [
      { en: "formal email", ka: "ოფიციალური იმეილი" },
      { en: "formal tone", ka: "ოფიციალური ტონი" },
    ],
  },
  "signature": {
    key: "signature",
    examples: [
      { en: "Add your job title to your email signature.", ka: "იმეილის ხელმოწერას შენი თანამდებობა დაამატე." },
      { en: "The contract needs two signatures.", ka: "კონტრაქტს ორი ხელმოწერა სჭირდება." },
    ],
    collocations: [
      { en: "email signature", ka: "იმეილის ხელმოწერა" },
      { en: "digital signature", ka: "ციფრული ხელმოწერა" },
    ],
  },
  "interview": {
    key: "interview",
    examples: [
      { en: "Her interview is scheduled for Monday morning.", ka: "მისი გასაუბრება ორშაბათ დილით არის დანიშნული." },
      { en: "Prepare three questions to ask at the interview.", ka: "გასაუბრებაზე დასასმელად სამი კითხვა მოამზადე." },
    ],
    collocations: [
      { en: "job interview", ka: "სამსახურის გასაუბრება" },
      { en: "pass an interview", ka: "გასაუბრების წარმატებით გავლა" },
    ],
  },
  "candidate": {
    key: "candidate",
    examples: [
      { en: "We interviewed five candidates this week.", ka: "ამ კვირაში ხუთ კანდიდატს გავესაუბრეთ." },
      { en: "She's the strongest candidate for the role.", ka: "ის ამ როლისთვის ყველაზე ძლიერი კანდიდატია." },
    ],
    collocations: [
      { en: "strong candidate", ka: "ძლიერი კანდიდატი" },
      { en: "shortlist candidates", ka: "კანდიდატების შერჩევა" },
    ],
  },
  "position": {
    key: "position",
    examples: [
      { en: "The position is still open.", ka: "პოზიცია ჯერ კიდევ ღიაა." },
      { en: "He accepted a senior position at a fintech company.", ka: "მან ფინტექ კომპანიაში უფროსი პოზიცია მიიღო." },
    ],
    collocations: [
      { en: "open position", ka: "ღია პოზიცია" },
      { en: "apply for a position", ka: "პოზიციაზე განაცხადის შეტანა" },
    ],
  },
  "apply": {
    key: "apply",
    examples: [
      { en: "You can apply online in ten minutes.", ka: "ონლაინ განაცხადის შეტანა ათ წუთში შეგიძლია." },
      { en: "More than fifty people applied for the job.", ka: "სამსახურზე ორმოცდაათზე მეტმა ადამიანმა შეიტანა განაცხადი." },
    ],
    collocations: [
      { en: "apply for a job", ka: "სამსახურზე განაცხადის შეტანა" },
      { en: "apply by Friday", ka: "პარასკევამდე განაცხადის შეტანა" },
    ],
  },
  "experience": {
    key: "experience",
    examples: [
      { en: "She has ten years of sales experience.", ka: "მას გაყიდვების ათწლიანი გამოცდილება აქვს." },
      { en: "No experience needed — we provide training.", ka: "გამოცდილება საჭირო არ არის — ტრენინგს ჩვენ გთავაზობთ." },
    ],
    collocations: [
      { en: "work experience", ka: "სამუშაო გამოცდილება" },
      { en: "hands-on experience", ka: "პრაქტიკული გამოცდილება" },
    ],
  },
  "salary": {
    key: "salary",
    examples: [
      { en: "The salary depends on experience.", ka: "ხელფასი გამოცდილებაზეა დამოკიდებული." },
      { en: "They offered a higher salary than expected.", ka: "მოსალოდნელზე მაღალი ხელფასი შემომთავაზეს." },
    ],
    collocations: [
      { en: "salary range", ka: "ხელფასის დიაპაზონი" },
      { en: "negotiate a salary", ka: "ხელფასზე მოლაპარაკება" },
    ],
  },
  "hire": {
    key: "hire",
    examples: [
      { en: "We're hiring two developers this quarter.", ka: "ამ კვარტალში ორ დეველოპერს ვიყვანთ." },
      { en: "They decided to hire her on the spot.", ka: "მისი აყვანა ადგილზევე გადაწყვიტეს." },
    ],
    collocations: [
      { en: "hire someone", ka: "თანამშრომლის აყვანა" },
      { en: "hiring process", ka: "აყვანის პროცესი" },
    ],
  },
  "reference": {
    key: "reference",
    examples: [
      { en: "Can you provide two references?", ka: "ორ რეკომენდატორს ხომ ვერ მიუთითებ?" },
      { en: "Her former manager gave an excellent reference.", ka: "მისმა ყოფილმა მენეჯერმა შესანიშნავი რეკომენდაცია მისცა." },
    ],
    collocations: [
      { en: "provide references", ka: "რეკომენდატორების მითითება" },
      { en: "reference check", ka: "რეკომენდაციების გადამოწმება" },
    ],
  },
  "presentation": {
    key: "presentation",
    examples: [
      { en: "The presentation lasted twenty minutes.", ka: "პრეზენტაცია ოცი წუთი გაგრძელდა." },
      { en: "I'm preparing a presentation for the board.", ka: "საბჭოსთვის პრეზენტაციას ვამზადებ." },
    ],
    collocations: [
      { en: "give a presentation", ka: "პრეზენტაციის ჩატარება" },
      { en: "prepare a presentation", ka: "პრეზენტაციის მომზადება" },
    ],
  },
  "slide": {
    key: "slide",
    examples: [
      { en: "Keep one idea per slide.", ka: "ერთ სლაიდზე ერთი იდეა დატოვე." },
      { en: "Can you go back to the previous slide?", ka: "წინა სლაიდზე ხომ ვერ დაბრუნდები?" },
    ],
    collocations: [
      { en: "title slide", ka: "სათაურის სლაიდი" },
      { en: "slide deck", ka: "სლაიდების ნაკრები" },
    ],
  },
  "audience": {
    key: "audience",
    examples: [
      { en: "Understand your audience before you write the talk.", ka: "სანამ მოხსენებას დაწერ, შენი აუდიტორია შეისწავლე." },
      { en: "The audience asked great questions.", ka: "აუდიტორიამ შესანიშნავი კითხვები დასვა." },
    ],
    collocations: [
      { en: "engage the audience", ka: "აუდიტორიის ჩართვა" },
      { en: "target audience", ka: "სამიზნე აუდიტორია" },
    ],
  },
  "present": {
    key: "present",
    examples: [
      { en: "She presented the results to the whole company.", ka: "მან შედეგები მთელ კომპანიას წარუდგინა." },
      { en: "I'll present first, then open the floor.", ka: "ჯერ მე წარვადგენ, შემდეგ სიტყვას გადავცემ." },
    ],
    collocations: [
      { en: "present findings", ka: "შედეგების წარდგენა" },
      { en: "present to the board", ka: "საბჭოს წინაშე წარდგენა" },
    ],
  },
  "summary": {
    key: "summary",
    examples: [
      { en: "Let me end with a short summary.", ka: "ბოლოს მოკლე შეჯამებით დავასრულებ." },
      { en: "The summary fits on one page.", ka: "შეჯამება ერთ გვერდზე ეტევა." },
    ],
    collocations: [
      { en: "brief summary", ka: "მოკლე შეჯამება" },
      { en: "one-page summary", ka: "ერთგვერდიანი შეჯამება" },
    ],
  },
  "takeaway": {
    key: "takeaway",
    examples: [
      { en: "The main takeaway: start earlier.", ka: "მთავარი დასკვნა: უფრო ადრე დაიწყე." },
      { en: "Write down one takeaway from each meeting.", ka: "ყოველი შეხვედრიდან თითო მთავარი დასკვნა ჩაიწერე." },
    ],
    collocations: [
      { en: "key takeaway", ka: "მთავარი დასკვნა" },
      { en: "practical takeaway", ka: "პრაქტიკული დასკვნა" },
    ],
  },
};


// ---- Situational clusters (scenarios) ----
export const SITUATION_CLUSTERS: SituationCluster[] = [
  {
    id: "running-a-meeting",
    titleEn: "Running a meeting",
    titleKa: "შეხვედრის გაძღოლა",
    category: "meetings",
    scenarioKa: "წარმოიდგინე, რომ დღეს შენ უძღვები გუნდის შეხვედრას — ხსნი დღის წესრიგს, ინაწილებ დავალებებს და აჯამებ შედეგებს.",
    wordKeys: ["meeting", "agenda-item", "chair", "minute-taker", "action-item", "next-steps", "recap", "postpone"],
    paragraphEn: "Nino is chairing today's team meeting. She opens with the agenda: three items, starting with the budget. Giorgi agrees to take the minutes. Halfway through, they decide to postpone the last item until next week. Before they wrap up, Nino captures the action items, assigns an owner to each, and gives a quick recap of the next steps.",
    paragraphKa: "ნინო დღეს გუნდის შეხვედრას უძღვება. ის იწყებს დღის წესრიგით: სამი პუნქტი, ბიუჯეტიდან. გიორგი თანხმდება, რომ ოქმს აწარმოებს. შუა გზაზე გადაწყვეტენ, რომ ბოლო პუნქტს მომავალ კვირამდე გადადებენ. დასრულებამდე ნინო ჩაიწერს სამოქმედო პუნქტებს, თითოეულს პასუხისმგებელს მიუჩენს და მოკლედ შეაჯამებს შემდეგ ნაბიჯებს.",
    dialogue: [
      { speaker: "ნინო", en: "Good morning everyone — let's get started. We have three agenda items today.", ka: "დილა მშვიდობისა ყველას — დავიწყოთ. დღეს დღის წესრიგში სამი პუნქტი გვაქვს." },
      { speaker: "გიორგი", en: "I can take the minutes today.", ka: "დღეს ოქმს მე ვაწარმოებ." },
      { speaker: "ნინო", en: "Thanks, Giorgi. First item: the budget.", ka: "გმადლობ, გიორგი. პირველი პუნქტი: ბიუჯეტი." },
      { speaker: "ლიკა", en: "Can we postpone the last item? We need more data.", ka: "ბოლო პუნქტს ხომ ვერ გადავდებთ? მეტი მონაცემი გვჭირდება." },
      { speaker: "ნინო", en: "Good idea — let's move it to next week. Now, action items.", ka: "კარგი აზრია — მომავალ კვირაზე გადავიტანოთ. ახლა — სამოქმედო პუნქტები." },
      { speaker: "გიორგი", en: "I'll send a recap with the next steps after the meeting.", ka: "შეხვედრის შემდეგ შეჯამებას შემდეგ ნაბიჯებთან ერთად გავგზავნი." },
    ],
  },
  {
    id: "status-update",
    titleEn: "Giving a status update",
    titleKa: "სტატუსის განახლება",
    category: "status",
    scenarioKa: "წარმოიდგინე, რომ მენეჯერს პროექტის მიმდინარეობას აცნობებ — რა დასრულდა, სად ხარ ახლა და რა გაფერხებს წინსვლას.",
    wordKeys: ["update", "status", "progress", "milestone", "priority", "blocker", "pending", "overdue"],
    paragraphEn: "Time for the weekly status update. Overall, we've made solid progress and hit our first milestone on schedule. The status is green. My top priority now is the payment integration. There's one blocker — the vendor's API is delayed — so that piece is still pending. One task is already overdue, and I'll clear it first.",
    paragraphKa: "ყოველკვირეული სტატუსის განახლების დროა. საერთო ჯამში, კარგი პროგრესი გვქონდა და პირველ ეტაპს გრაფიკში მივაღწიეთ. სტატუსი მწვანეა. ჩემი მთავარი პრიორიტეტი ახლა გადახდის ინტეგრაციაა. ერთი შემაფერხებელია — მომწოდებლის API დაგვიანებულია — ამიტომ ეს ნაწილი ჯერ კიდევ მოლოდინშია. ერთი დავალება უკვე ვადაგადაცილებულია და ჯერ მას მოვაგვარებ.",
    dialogue: [
      { speaker: "მენეჯერი", en: "Quick status update — where are we on the project?", ka: "მოკლე სტატუსის განახლება — სად ვართ პროექტზე?" },
      { speaker: "დათო", en: "Good progress this week. We hit the first milestone on schedule.", ka: "ამ კვირაში კარგი პროგრესია. პირველ ეტაპს გრაფიკში მივაღწიეთ." },
      { speaker: "მენეჯერი", en: "Any blockers?", ka: "შემაფერხებელი ხომ არაფერია?" },
      { speaker: "დათო", en: "One — the vendor's API is delayed, so that part is still pending.", ka: "ერთი — მომწოდებლის API აგვიანებს, ამიტომ ის ნაწილი ჯერ მოლოდინშია." },
      { speaker: "მენეჯერი", en: "Understood. What's your top priority now?", ka: "გასაგებია. ახლა რა არის შენი მთავარი პრიორიტეტი?" },
      { speaker: "დათო", en: "The overdue task from last week — I'll close it today.", ka: "გასული კვირის ვადაგადაცილებული დავალება — დღეს დავხურავ." },
    ],
  },
  {
    id: "emails-and-messaging",
    titleEn: "Emails & messaging",
    titleKa: "იმეილები და მიმოწერა",
    category: "emails",
    scenarioKa: "წარმოიდგინე, რომ კლიენტს პასუხი არ მოუწერია და საქმიან, თავაზიან შემახსენებელ იმეილს წერ.",
    wordKeys: ["subject", "draft", "attach", "reply", "forward", "cc", "bcc", "follow-up", "inbox"],
    paragraphEn: "Giorgi opens his inbox and sees there's still no reply from the client, so he writes a short follow-up. He keeps the subject line clear, attaches the updated proposal, and adds his manager in CC. Before sending, he saves the email as a draft and reads it one more time. Then he forwards a copy to the finance team as well.",
    paragraphKa: "გიორგი ინბოქსს ხსნის და ხედავს, რომ კლიენტისგან პასუხი ისევ არ არის, ამიტომ მოკლე შეხსენებას წერს. თემას მკაფიოს ტოვებს, განახლებულ შეთავაზებას ამაგრებს და მენეჯერს ღია ასლში ამატებს. გაგზავნამდე იმეილს მონახაზად ინახავს და კიდევ ერთხელ გადაიკითხავს. ბოლოს ასლს ფინანსურ გუნდსაც უგზავნის.",
    dialogue: [
      { speaker: "გიორგი", en: "Did the client reply to our proposal?", ka: "კლიენტმა ჩვენს შეთავაზებას უპასუხა?" },
      { speaker: "ნინო", en: "Not yet. I'm writing a short follow-up now.", ka: "ჯერ არა. ახლა მოკლე შეხსენებას ვწერ." },
      { speaker: "გიორგი", en: "Keep the subject line clear — and attach the updated file.", ka: "თემა მკაფიო დატოვე — და განახლებული ფაილი მიამაგრე." },
      { speaker: "ნინო", en: "Done. Should I add the manager in CC?", ka: "გავაკეთე. მენეჯერი ღია ასლში დავამატო?" },
      { speaker: "გიორგი", en: "Yes. And save it as a draft first — read it once more before sending.", ka: "კი. ჯერ მონახაზად შეინახე — გაგზავნამდე კიდევ ერთხელ გადაიკითხე." },
      { speaker: "ნინო", en: "Good call. Sending it now — I'll forward you a copy.", ka: "სწორი შენიშვნაა. ვაგზავნი — ასლს გადმოგიგზავნი." },
    ],
  },
  {
    id: "deadlines-and-scheduling",
    titleEn: "Deadlines & scheduling",
    titleKa: "ვადები და განრიგი",
    category: "scheduling",
    scenarioKa: "წარმოიდგინე, რომ კვირის განრიგი ირევა — შეხვედრების გადატანა, დროების დადასტურება და ვადების დაცვა შენზეა.",
    wordKeys: ["deadline", "reschedule", "cancel", "confirm", "availability", "urgent", "asap", "eod", "buffer"],
    paragraphEn: "The client asks to reschedule Friday's review, but the deadline can't move. Ana checks the team's availability and confirms a new time for Thursday morning. She marks the invite as urgent and asks everyone to respond by EOD. One workshop gets canceled to free up time, and she adds a small buffer before the final review — in case anything needs fixing ASAP.",
    paragraphKa: "კლიენტი პარასკევის განხილვის გადატანას ითხოვს, მაგრამ ბოლო ვადა ვერ იცვლება. ანა გუნდის თავისუფალ დროებს ამოწმებს და ხუთშაბათ დილისთვის ახალ დროს ადასტურებს. მოსაწვევს გადაუდებლად ნიშნავს და ყველას სთხოვს, დღის ბოლომდე უპასუხონ. დროის გასათავისუფლებლად ერთი ვორქშოფი უქმდება, ხოლო საბოლოო განხილვამდე მცირე სარეზერვო დროს ამატებს — თუ რამის სასწრაფოდ გასწორება დასჭირდებათ.",
    dialogue: [
      { speaker: "ანა", en: "The client wants to reschedule Friday's review.", ka: "კლიენტს პარასკევის განხილვის გადატანა უნდა." },
      { speaker: "ლუკა", en: "The deadline can't move, though.", ka: "ბოლო ვადა კი ვერ შეიცვლება." },
      { speaker: "ანა", en: "I know. What's your availability Thursday morning?", ka: "ვიცი. ხუთშაბათ დილით როდის გაქვს თავისუფალი დრო?" },
      { speaker: "ლუკა", en: "I'm free before noon. Mark it urgent so everyone confirms.", ka: "შუადღემდე თავისუფალი ვარ. გადაუდებლად მონიშნე, რომ ყველამ დაადასტუროს." },
      { speaker: "ანა", en: "Will do — I'll ask everyone to respond by EOD.", ka: "კარგი — ყველას ვთხოვ, დღის ბოლომდე უპასუხონ." },
      { speaker: "ლუკა", en: "And add a small buffer before the final review, just in case.", ka: "და საბოლოო განხილვამდე მცირე სარეზერვო დროც ჩადე, ყოველი შემთხვევისთვის." },
    ],
  },
  {
    id: "negotiation",
    titleEn: "Negotiating a deal",
    titleKa: "მოლაპარაკება და გარიგება",
    category: "negotiation",
    scenarioKa: "წარმოიდგინე, რომ კლიენტთან ფასსა და პირობებზე მოლაპარაკებას აწარმოებ — გინდა გარიგება ისე დახურო, რომ ორივე მხარე მოგებული დარჩეს.",
    wordKeys: ["negotiate", "offer", "counteroffer", "concession", "compromise", "consensus", "win-win", "terms", "deal"],
    paragraphEn: "The client liked our proposal but not the price, so they sent a counteroffer. We negotiated for a week: we made a small concession on payment terms, and they compromised on the delivery date. Once both sides reached consensus, we closed the deal — a real win-win, with a better offer than either side expected.",
    paragraphKa: "კლიენტს ჩვენი წინადადება მოეწონა, ფასი — ვერა, ამიტომ საპასუხო შეთავაზება გამოგვიგზავნა. ერთი კვირა ვმოლაპარაკობდით: ჩვენ გადახდის პირობებში მცირე დათმობაზე წავედით, ისინი კი მიწოდების თარიღზე დათანხმდნენ კომპრომისს. როცა ორივე მხარემ კონსენსუსს მიაღწია, გარიგება დავხურეთ — ნამდვილი ორმხრივი მოგება, ორივესთვის მოსალოდნელზე უკეთესი შეთავაზებით.",
    dialogue: [
      { speaker: "კლიენტი", en: "We like the proposal, but the price is too high.", ka: "შეთავაზება მოგვწონს, მაგრამ ფასი ძალიან მაღალია." },
      { speaker: "ნინო", en: "We can negotiate. What terms would work for you?", ka: "შეგვიძლია მოვილაპარაკოთ. რა პირობები გაწყობდათ?" },
      { speaker: "კლიენტი", en: "Here's our counteroffer — ten percent less, faster delivery.", ka: "აი ჩვენი საპასუხო შეთავაზება — ათი პროცენტით ნაკლები, უფრო სწრაფი მიწოდება." },
      { speaker: "ნინო", en: "We can make a concession on price if you're flexible on the delivery date.", ka: "ფასში დათმობა შეგვიძლია, თუ მიწოდების თარიღში მოქნილები იქნებით." },
      { speaker: "კლიენტი", en: "That sounds like a fair compromise.", ka: "ეს სამართლიან კომპრომისად ჟღერს." },
      { speaker: "ნინო", en: "Great — a real win-win. Let's close the deal.", ka: "მშვენიერია — ნამდვილი ორმხრივი მოგება. გარიგება დავხუროთ." },
    ],
  },
  {
    id: "feedback-and-reviews",
    titleEn: "Feedback & reviews",
    titleKa: "უკუკავშირი და შეფასება",
    category: "feedback",
    scenarioKa: "წარმოიდგინე, რომ მენეჯერთან ერთი-ერთზე შეხვედრაზე ხარ — განიხილავთ შენს ძლიერ მხარეებს, ზრდის სივრცეებს და მომავალ მიზნებს.",
    wordKeys: ["feedback", "constructive", "peer-review", "strength", "weakness", "highlight", "improve", "one-on-one", "performance-review"],
    paragraphEn: "It's performance review season. In our one-on-one, my manager starts by highlighting my strengths — client communication and reliability. Then we discuss one weakness: I rarely ask for feedback early. Her criticism is constructive, with clear examples. We agree on two things to improve this quarter, and I'll send my next report for peer review before the deadline.",
    paragraphKa: "საქმიანობის შეფასების სეზონია. ჩვენს ერთი-ერთზე შეხვედრაზე მენეჯერი ჩემი ძლიერი მხარეების გამოკვეთით იწყებს — კლიენტებთან კომუნიკაცია და საიმედოობა. შემდეგ ერთ სუსტ მხარეს განვიხილავთ: უკუკავშირს იშვიათად ვითხოვ ადრეულ ეტაპზე. მისი კრიტიკა კონსტრუქციულია, მკაფიო მაგალითებით. ვთანხმდებით ორ რამეზე, რასაც ამ კვარტალში გავაუმჯობესებ, ხოლო შემდეგ ანგარიშს ვადამდე კოლეგათა შეფასებაზე გავგზავნი.",
    dialogue: [
      { speaker: "მენეჯერი", en: "Let's start your performance review. First, your strengths.", ka: "დავიწყოთ შენი საქმიანობის შეფასება. ჯერ — ძლიერი მხარეები." },
      { speaker: "დათო", en: "Thank you. I'd also like honest feedback on what to improve.", ka: "გმადლობ. მინდა გულწრფელი უკუკავშირიც, რა გავაუმჯობესო." },
      { speaker: "მენეჯერი", en: "Your client communication is excellent. One weakness: you ask for feedback too late.", ka: "კლიენტებთან კომუნიკაცია შესანიშნავი გაქვს. ერთი სუსტი მხარე: უკუკავშირს გვიან ითხოვ." },
      { speaker: "დათო", en: "That's fair — and constructive. How can I fix it?", ka: "სამართლიანია — და კონსტრუქციული. როგორ გამოვასწორო?" },
      { speaker: "მენეჯერი", en: "Send your drafts for peer review earlier. Let's check progress in our next one-on-one.", ka: "მონახაზები კოლეგათა შეფასებაზე უფრო ადრე გააგზავნე. პროგრესი შემდეგ ერთი-ერთზე შეხვედრაზე შევამოწმოთ." },
      { speaker: "დათო", en: "Deal. I'll highlight the changes in my next report.", ka: "შევთანხმდით. ცვლილებებს შემდეგ ანგარიშში გამოვკვეთ." },
    ],
  },
  {
    id: "requesting-by-email",
    titleEn: "Requesting by email",
    titleKa: "მოთხოვნა იმეილით",
    category: "emails",
    scenarioKa: "წარმოიდგინე, რომ კოლეგებს ოფიციალური იმეილით ინფორმაციას სთხოვ — თავაზიანად, მკაფიოდ და სწორი ფორმით.",
    wordKeys: ["request", "respond", "attachment", "submit", "clarify", "apologize", "formal", "signature"],
    paragraphEn: "Sopho needs last quarter's numbers, so she writes a formal request to the finance team. She keeps the tone polite, asks them to clarify two figures, and reminds them to submit the final report as an attachment. They respond the same day and apologize for the earlier delay. Before sending her reply, she checks that her email signature is up to date.",
    paragraphKa: "სოფოს გასული კვარტლის ციფრები სჭირდება, ამიტომ ფინანსურ გუნდს ოფიციალურ მოთხოვნას სწერს. ტონს თავაზიანს ინარჩუნებს, სთხოვს ორი მაჩვენებლის დაზუსტებას და ახსენებს, რომ საბოლოო ანგარიში მიმაგრებული ფაილის სახით წარადგინონ. ისინი იმავე დღეს პასუხობენ და ადრინდელი დაგვიანებისთვის ბოდიშს იხდიან. პასუხის გაგზავნამდე ის ამოწმებს, რომ იმეილის ხელმოწერა განახლებულია.",
    dialogue: [
      { speaker: "სოფო", en: "Dear team, I'm writing to request last quarter's sales numbers.", ka: "ძვირფასო გუნდო, გწერთ, რომ გასული კვარტლის გაყიდვების ციფრები მოვითხოვო." },
      { speaker: "სოფო", en: "Could you also clarify the March figures? Please send the report as an attachment.", ka: "მარტის მაჩვენებლებსაც ხომ ვერ დააზუსტებთ? ანგარიში, გთხოვთ, მიმაგრებული ფაილის სახით გამოაგზავნეთ." },
      { speaker: "ფინანსები", en: "Of course — we'll respond with the full file by tomorrow.", ka: "რა თქმა უნდა — სრული ფაილით ხვალამდე გიპასუხებთ." },
      { speaker: "ფინანსები", en: "We apologize for the delay with the March data.", ka: "ბოდიშს გიხდით მარტის მონაცემების დაგვიანებისთვის." },
      { speaker: "სოფო", en: "No problem. Please submit the final version by Friday.", ka: "არაუშავს. საბოლოო ვერსია, გთხოვთ, პარასკევამდე წარადგინეთ." },
      { speaker: "ფინანსები", en: "Will do. Sending it in a formal template with my signature.", ka: "აუცილებლად. ოფიციალური შაბლონით და ჩემი ხელმოწერით გამოგიგზავნით." },
    ],
  },
  {
    id: "job-interview",
    titleEn: "Job interview",
    titleKa: "სამსახურის გასაუბრება",
    category: "interview",
    scenarioKa: "წარმოიდგინე, რომ სასურველ პოზიციაზე გასაუბრებაზე ხარ — შენს გამოცდილებაზე საუბრობ და ჭკვიან კითხვებს სვამ.",
    wordKeys: ["interview", "candidate", "position", "apply", "experience", "salary", "hire", "reference"],
    paragraphEn: "Keti applied for a project manager position last month. Today is her interview. The recruiter asks about her experience with international teams, and she gives concrete examples. As a candidate she also asks smart questions — about the team, growth, and only then about salary. Two days later they call her references, and by Friday she hears the words everyone hopes for: we'd like to hire you.",
    paragraphKa: "ქეთიმ გასულ თვეში პროექტის მენეჯერის პოზიციაზე განაცხადი შეიტანა. დღეს მისი გასაუბრებაა. რეკრუტერი საერთაშორისო გუნდებთან მუშაობის გამოცდილებაზე ეკითხება და ის კონკრეტულ მაგალითებს იხსენებს. როგორც კანდიდატი, თავადაც სვამს ჭკვიან კითხვებს — გუნდზე, ზრდაზე და მხოლოდ ბოლოს ხელფასზე. ორ დღეში მის რეკომენდატორებს ურეკავენ, პარასკევს კი ესმის სიტყვები, რომლის იმედიც ყველას აქვს: გვინდა აგიყვანოთ.",
    dialogue: [
      { speaker: "რეკრუტერი", en: "Thanks for coming in. Why did you apply for this position?", ka: "გმადლობთ მობრძანებისთვის. რატომ შეიტანეთ განაცხადი ამ პოზიციაზე?" },
      { speaker: "ქეთი", en: "It matches my experience — five years leading product teams.", ka: "ის ჩემს გამოცდილებას ერგება — ხუთი წელი პროდუქტის გუნდებს ვხელმძღვანელობდი." },
      { speaker: "რეკრუტერი", en: "What makes you a strong candidate?", ka: "რა გხდით ძლიერ კანდიდატად?" },
      { speaker: "ქეთი", en: "I deliver on time — my references can confirm that.", ka: "დროულად ვასრულებ საქმეს — ამას ჩემი რეკომენდატორები დაადასტურებენ." },
      { speaker: "რეკრუტერი", en: "What are your salary expectations?", ka: "რა ხელფასის მოლოდინი გაქვთ?" },
      { speaker: "ქეთი", en: "I'd like to hear the range for the role — I'm flexible for the right team.", ka: "მინდა როლის დიაპაზონი მოვისმინო — სწორი გუნდისთვის მოქნილი ვარ." },
    ],
  },
  {
    id: "giving-a-presentation",
    titleEn: "Giving a presentation",
    titleKa: "პრეზენტაციის ჩატარება",
    category: "presentations",
    scenarioKa: "წარმოიდგინე, რომ კვარტალურ შედეგებს გუნდის წინაშე წარადგენ — მკაფიო სლაიდებით და ერთი მთავარი დასკვნით.",
    wordKeys: ["presentation", "slide", "audience", "present", "summary", "takeaway"],
    paragraphEn: "Luka is giving the quarterly presentation. He keeps it to ten slides and starts with the main takeaway, so the audience knows from the first minute why it matters. He presents the numbers slowly, pausing for questions. At the end he shows a one-slide summary and asks: what should we do differently next quarter?",
    paragraphKa: "ლუკა კვარტალურ პრეზენტაციას ატარებს. ის ათ სლაიდში ეტევა და მთავარი დასკვნით იწყებს, რომ აუდიტორიამ პირველივე წუთიდან იცოდეს, რატომ არის ეს მნიშვნელოვანი. ციფრებს ნელა წარადგენს და კითხვებისთვის პაუზებს აკეთებს. ბოლოს ერთსლაიდიან შეჯამებას აჩვენებს და ეკითხება: რა უნდა გავაკეთოთ განსხვავებულად მომავალ კვარტალში?",
    dialogue: [
      { speaker: "ლუკა", en: "Before I start the presentation — can everyone see the first slide?", ka: "სანამ პრეზენტაციას დავიწყებ — პირველი სლაიდი ყველას უჩანს?" },
      { speaker: "ანა", en: "Yes, all good.", ka: "კი, ყველაფერი კარგადაა." },
      { speaker: "ლუკა", en: "Great. The main takeaway today: revenue is up twelve percent.", ka: "მშვენიერია. დღევანდელი მთავარი დასკვნა: შემოსავალი თორმეტი პროცენტით გაიზარდა." },
      { speaker: "ანა", en: "Nice opening — the audience loves numbers first.", ka: "კარგი დასაწყისია — აუდიტორიას ციფრები თავიდან უყვარს." },
      { speaker: "ლუკა", en: "I'll present the details region by region, then take questions.", ka: "დეტალებს რეგიონების მიხედვით წარვადგენ, შემდეგ კითხვებს ვუპასუხებ." },
      { speaker: "ანა", en: "Perfect. End with the summary slide — people remember the last thing they see.", ka: "იდეალურია. შეჯამების სლაიდით დაასრულე — ხალხს ბოლოს ნანახი ამახსოვრდება." },
    ],
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

export function clustersByCategory(category: ScenarioCategory): SituationCluster[] {
  return SITUATION_CLUSTERS.filter((c) => c.category === category);
}

/** Categories that currently have at least one scenario, in display order. */
export function availableCategories(): ScenarioCategory[] {
  const order: ScenarioCategory[] = [
    "meetings", "emails", "status", "scheduling",
    "negotiation", "feedback", "interview", "presentations",
  ];
  return order.filter((cat) => SITUATION_CLUSTERS.some((c) => c.category === cat));
}

/** All word keys that currently have a context entry. */
export function allContextKeys(): string[] {
  return Object.keys(WORD_CONTEXT);
}