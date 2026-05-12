import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { SCENARIOS, Scenario } from "./data";

const LEVEL_LABEL: Record<Scenario["level"], string> = {
  Beginner: "დამწყები",
  Elementary: "საშუალო-დამწყები",
  Intermediate: "საშუალო",
};

const LEVEL_COLOR: Record<Scenario["level"], string> = {
  Beginner: "bg-green-500/15 text-green-700",
  Elementary: "bg-blue-500/15 text-blue-700",
  Intermediate: "bg-purple-500/15 text-purple-700",
};

export default function RoleplayList() {
  const groups: Scenario["level"][] = ["Beginner", "Elementary", "Intermediate"];
  return (
    <Layout>
      <PageHeader title="როლური საუბარი" backTo="/path/speaking" />
      <div className="space-y-6 py-2">
        <p className="text-sm text-muted-foreground ka">
          აირჩიე სცენარი და ივარჯიშე რეალურ სიტუაციაში AI პარტნიორთან.
        </p>
        {groups.map((lvl) => {
          const items = SCENARIOS.filter((s) => s.level === lvl);
          if (!items.length) return null;
          return (
            <div key={lvl} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ka ${LEVEL_COLOR[lvl]}`}>
                  {LEVEL_LABEL[lvl]}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((s) => (
                  <div key={s.id} className="p-4 rounded-2xl bg-card border border-border shadow-card flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{s.emoji}</div>
                      <div className="min-w-0">
                        <div className="font-bold ka">{s.title_ka}</div>
                        <div className="text-xs text-muted-foreground ka mt-1">{s.description_ka}</div>
                      </div>
                    </div>
                    <Button asChild variant="hero" size="lg" className="w-full ka mt-auto">
                      <Link to={`/path/speaking/roleplay/${s.id}`}>დაწყება</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
