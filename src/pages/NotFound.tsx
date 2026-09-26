import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEO
        title="გვერდი ვერ მოიძებნა (404), SpeakBusy"
        description="მოთხოვნილი გვერდი არ არსებობს. დაბრუნდი მთავარ გვერდზე და გააგრძელე ბიზნეს ინგლისურის სწავლა SpeakBusy-ით."
        path={location.pathname}
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="ka mb-4 text-xl text-foreground">გვერდი ვერ მოიძებნა</p>
        <a href="/" className="ka text-primary underline hover:text-primary/90">
          მთავარ გვერდზე დაბრუნება
        </a>
      </div>
    </div>
  );
};

export default NotFound;