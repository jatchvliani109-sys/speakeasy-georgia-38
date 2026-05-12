import PathDashboardShell from "./PathDashboardShell";

export default function BusinessDashboard() {
  return (
    <PathDashboardShell
      badge="💼 ბიზნეს ინგლისური"
      title="ბიზნეს ინგლისური"
      themeClass="border-amber-400/40 bg-gradient-to-br from-slate-900/5 to-amber-500/10"
      accentClass="text-slate-800"
      ctaLabel="💼 ბიზნეს გაკვეთილის დაწყება"
      ctaTo="/lesson"
      cards={[
        { title: "გასაუბრება", icon: "🤝" },
        { title: "სამუშაო იმეილები", icon: "📨" },
        { title: "შეხვედრები", icon: "🗓️" },
        { title: "პრეზენტაციები", icon: "📊" },
      ]}
    />
  );
}
