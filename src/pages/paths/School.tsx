import PathDashboardShell from "./PathDashboardShell";

export default function SchoolDashboard() {
  return (
    <PathDashboardShell
      badge="🎒 სკოლის ინგლისური"
      title="სკოლის ინგლისური"
      themeClass="border-yellow-400/50 bg-gradient-to-br from-yellow-200/40 via-sky-200/30 to-green-200/30"
      accentClass="text-amber-600"
      ctaLabel="🚀 დაწყება"
      ctaTo="/lesson"
      cards={[
        { title: "სიტყვები", icon: "🔤" },
        { title: "მარტივი გრამატიკა", icon: "📘" },
        { title: "სახალისო ქვიზი", icon: "🎲" },
        { title: "ჩემი პროგრესი", icon: "⭐" },
      ]}
    />
  );
}
