import { Link, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowRight, Mic, Briefcase, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth";

const features = [
  {
    icon: Mic,
    eyebrow: "Speaking",
    title: "საუბრის განვითარება",
    desc: "ივარჯიშე ნამდვილ AI მასწავლებელთან — სტრუქტურირებული სესიები და რეალურ სიტუაციებზე დაფუძნებული დიალოგები, რომლებიც გაძლიერებს თავდაჯერებას, გამოთქმასა და ბუნებრივ მეტყველებას.",
  },
  {
    icon: Briefcase,
    eyebrow: "Business English",
    title: "ბიზნეს ინგლისური",
    desc: "პერსონალიზებული ბიზნეს ინგლისურის გზა შენი პროფესიისა და მიზნების მიხედვით — დონის ტესტი, სტრუქტურირებული მოდულები, იმეილები, გასაუბრებები, შეხვედრები და პრეზენტაციები.",
  },
  {
    icon: GraduationCap,
    eyebrow: "აბიტურიენტი",
    title: "ეროვნული გამოცდებისთვის",
    desc: "სტრუქტურირებული მომზადება მე-11 და მე-12 კლასელებისთვის — გრამატიკა, ლექსიკა, კითხვა და სავარჯიშო გამოცდები ეროვნული ფორმატით.",
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
          SpeakEasy
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

      <section className="grid gap-3 mt-10 mb-8">
        <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#6B7280] ka mb-1">
          რას მიიღებ
        </div>
        {features.map((f) => (
          <div
            key={f.title}
            className="flex items-center gap-4 p-4 rounded-xl bg-[#FAFAF7] border border-[#E5E2D8] ka transition-colors hover:border-[#C9A227]/40"
          >
            <div className="w-11 h-11 rounded-lg bg-[#071A2F] flex items-center justify-center text-[#C9A227] shrink-0">
              <f.icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[#071A2F] text-sm">{f.title}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </section>
    </Layout>
  );
};

export default Index;
