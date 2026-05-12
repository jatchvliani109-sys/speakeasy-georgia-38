import PathDashboardShell from "./PathDashboardShell";

export default function WritingDashboard() {
  return (
    <PathDashboardShell
      badge="✍️ წერის გაუმჯობესება"
      title="წერის გაუმჯობესება"
      themeClass="border-slate-300 bg-gradient-to-br from-slate-50 to-white"
      accentClass="text-slate-700"
      ctaLabel="✍️ წერის პრაქტიკა"
      ctaTo="/lesson"
      cards={[
        { title: "ესეს წერა", icon: "📝" },
        { title: "იმეილის წერა", icon: "📧" },
        { title: "წინადადებების გაუმჯობესება", icon: "✏️" },
        { title: "ჩემი ნაწერები", icon: "📚" },
      ]}
    />
  );
}
