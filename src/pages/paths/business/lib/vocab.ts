export type BusinessVocab = {
  word: string;
  georgian: string;
  explanation: string;
  example: string;
  exampleKa: string;
  phrase: string;
  phraseKa: string;
  practice: string;
  practiceAnswer: string;
};

export const SAMPLE_BUSINESS_VOCAB: BusinessVocab[] = [
  {
    word: "Revenue",
    georgian: "შემოსავალი",
    explanation:
      "Revenue არის ფული, რომელსაც კომპანია იღებს გაყიდვებიდან ან მომსახურებიდან.",
    example: "The company increased its revenue this year.",
    exampleKa: "კომპანიამ წელს შემოსავალი გაზარდა.",
    phrase: "increase revenue",
    phraseKa: "შემოსავლის გაზრდა",
    practice: "The company wants to increase its ______.",
    practiceAnswer: "revenue",
  },
  {
    word: "Deadline",
    georgian: "ბოლო ვადა",
    explanation: "Deadline არის ბოლო თარიღი, რომელშიც დავალება უნდა დასრულდეს.",
    example: "We need to meet the deadline by Friday.",
    exampleKa: "ვადა პარასკევისთვის უნდა დავიცვათ.",
    phrase: "meet a deadline",
    phraseKa: "ვადის დაცვა",
    practice: "Please meet the project ______.",
    practiceAnswer: "deadline",
  },
  {
    word: "Stakeholder",
    georgian: "დაინტერესებული მხარე",
    explanation:
      "Stakeholder არის ადამიანი ან ჯგუფი, რომელსაც აქვს ინტერესი კომპანიის ან პროექტის მიმართ.",
    example: "We informed all stakeholders about the new strategy.",
    exampleKa: "ახალი სტრატეგიის შესახებ ყველა დაინტერესებული მხარე ვაცნობეთ.",
    phrase: "key stakeholders",
    phraseKa: "მთავარი დაინტერესებული მხარეები",
    practice: "We must update the ______ every week.",
    practiceAnswer: "stakeholders",
  },
  {
    word: "Follow up",
    georgian: "მიყოლა / გადამოწმება",
    explanation:
      "Follow up ნიშნავს იმეილით ან შეტყობინებით განმეორებითი დაკავშირებას რაიმე საკითხზე.",
    example: "I will follow up with the client tomorrow.",
    exampleKa: "ხვალ კლიენტს დავუკავშირდები.",
    phrase: "follow up on an email",
    phraseKa: "იმეილზე გადამოწმება",
    practice: "Could you ______ up with them next week?",
    practiceAnswer: "follow",
  },
];
