import PathDashboardShell from "./PathDashboardShell";

export default function SpeakingDashboard() {
  return (
    <PathDashboardShell
      badge="🎙️ საუბრის გაუმჯობესება"
      title="საუბრის გაუმჯობესება"
      themeClass="border-purple-400/40 bg-gradient-to-br from-purple-500/10 to-blue-500/10"
      accentClass="text-purple-600"
      ctaLabel="🎙️ საუბრის დაწყება"
      ctaTo="/lesson"
      cards={[
        { title: "საუბრის გაკვეთილი", icon: "💬" },
        { title: "გამოთქმა", icon: "🔊" },
        { title: "როლური თამაში", icon: "🎭" },
        { title: "ჩემი საუბრის პროგრესი", icon: "📈" },
      ]}
    />
  );
}
