import PathDashboardShell from "./PathDashboardShell";

export default function NationalExamDashboard() {
  return (
    <PathDashboardShell
      badge="🎓 ეროვნული გამოცდები"
      title="ეროვნული გამოცდები / აბიტურიენტები"
      themeClass="border-emerald-500/40 bg-gradient-to-br from-blue-950/5 to-emerald-500/10"
      accentClass="text-blue-900"
      ctaLabel="🎯 მომზადების დაწყება"
      ctaTo="/lesson"
      cards={[
        { title: "გრამატიკა", icon: "📐" },
        { title: "კითხვა და გააზრება", icon: "📖" },
        { title: "ლექსიკა", icon: "🧠" },
        { title: "ტესტები", icon: "🧪" },
        { title: "ჩემი შედეგები", icon: "🏆" },
      ]}
    />
  );
}
