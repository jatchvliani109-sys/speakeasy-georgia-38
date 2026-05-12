import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { MessageCircle, Languages, CheckCircle2, BookOpen, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";

const features = [
  { icon: MessageCircle, title: "AI საუბრის ვარჯიში", desc: "ისაუბრე ნამდვილ AI მასწავლებელთან" },
  { icon: Languages, title: "ქართული ახსნები", desc: "გაუგებრობის შემთხვევაში — ქართულად" },
  { icon: CheckCircle2, title: "გრამატიკის შესწორება", desc: "ნაზად, შეცდომების გარეშე" },
  { icon: BookOpen, title: "ახალი სიტყვები", desc: "ყოველი გაკვეთილის შემდეგ" },
  { icon: TrendingUp, title: "პროგრესი", desc: "თვალი ადევნე საკუთარ ზრდას" },
];

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return (
  <Layout showLogout={false}>
    <section className="py-8 text-center ka">
      <div className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
        🇬🇪 ქართველი მოსწავლეებისთვის
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5 ka">
        ისწავლე ინგლისურად საუბარი{" "}
        <span className="text-primary">AI მასწავლებელთან</span>
      </h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto ka">
        ივარჯიშე ყოველდღე, მიიღე შეცდომების გასწორება და ისაუბრე უფრო თავდაჯერებულად.
      </p>
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <Button asChild variant="hero" size="xl" className="ka">
          <Link to="/auth">დაწყება</Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="ka">
          <Link to="/auth?mode=login">უკვე მაქვს ანგარიში</Link>
        </Button>
      </div>
    </section>

    <section className="grid gap-3 mt-8">
      {features.map((f) => (
        <div key={f.title} className="flex items-center gap-4 p-4 rounded-2xl gradient-card shadow-card border border-border ka">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <f.icon className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold">{f.title}</div>
            <div className="text-sm text-muted-foreground">{f.desc}</div>
          </div>
        </div>
      ))}
    </section>
  </Layout>
);

export default Index;
