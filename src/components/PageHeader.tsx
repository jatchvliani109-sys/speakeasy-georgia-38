import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export default function PageHeader({ title, backTo }: { title: string; backTo?: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 mb-4">
      <Button
        variant="soft"
        size="icon"
        aria-label="უკან"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        className="shrink-0 h-10 w-10"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <h1 className="text-lg sm:text-xl font-extrabold ka flex-1 text-center min-w-0 break-words leading-snug line-clamp-2">{title}</h1>
      <Button
        variant="soft"
        size="icon"
        aria-label="მთავარი"
        onClick={() => navigate("/dashboard")}
        className="shrink-0 h-10 w-10"
      >
        <Home className="w-5 h-5" />
      </Button>
    </div>
  );
}
