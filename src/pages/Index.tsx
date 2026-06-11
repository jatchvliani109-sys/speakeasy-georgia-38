import { Link, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowRight, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth";

const features = [
  {
    icon: Briefcase,
    eyebrow: "Business English",
    title: "ბიზნეს ინგლისური",
    desc: "პერსონალიზებული ბიზნეს ინგლისურის გზა შენი პროფესიისა და მიზნების მიხედვით — დონის ტესტი, სტრუქტურირებული მოდულები, იმეილები, გასაუბრებები, შეხვედრები და პრეზენტაციები.",
  },
];


const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <Layout showLogout={false}>
      <section className="py-12 sm:py-16 text-center ka">
        <div className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#C9A227]">
          <span className="h-px w-6 bg-[#C9A227]" />
          SpeakBusy
          <span className="h-px w-6 bg-[#C9A227]" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mt-5 mb-5 ka text-[#071A2F] tracking-tight">
          ისწავლე ინგლისური{" "}
          <span className="block sm:inline text-[#0F2748]">თავდაჯერებულად</span>
        </h1>
        <p className="text-base sm:text-lg text-[#6B7280] mb-9 max-w-md mx-auto ka leading-relaxed">
          AI მასწავლებელი, რომელიც გესაუბრება ქართულად და ინგლისურად — შენი ტემპით.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            to="/auth"
            className="group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#071A2F] text-[#FAFAF7] text-sm font-semibold tracking-wide ka hover:bg-[#0F2748] transition-colors"
          >
            დაწყება
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/auth?mode=login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-semibold ka text-[#071A2F] hover:bg-[#F7F1E3] transition-colors"
          >
            უკვე მაქვს ანგარიში
          </Link>
        </div>
      </section>

      <div className="h-px bg-[#E5E2D8] my-2" />

      <section className="mt-10 mb-10">
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#6B7280] ka mb-5 text-center">
          ბიზნეს ინგლისური — შენი მიზნისთვის
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="group relative flex gap-5 p-5 sm:p-6 rounded-2xl bg-[#FAFAF7] border border-[#E5E2D8] ka transition-all hover:border-[#C9A227]/50 hover:shadow-[0_8px_24px_-16px_rgba(7,26,47,0.18)]"
            >
              <div className="flex flex-col items-center shrink-0">
                <div className="w-11 h-11 rounded-xl bg-[#071A2F] flex items-center justify-center text-[#C9A227]">
                  <f.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="mt-3 text-[10px] font-semibold tracking-[0.18em] uppercase text-[#9CA3AF] tabular-nums">
                  0{i + 1}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#C9A227]">
                  {f.eyebrow}
                </div>
                <h3 className="font-bold text-[#071A2F] text-base sm:text-lg mt-1.5 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-[13px] sm:text-sm text-[#6B7280] leading-relaxed mt-2">
                  {f.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

    </Layout>
  );
};

export default Index;
