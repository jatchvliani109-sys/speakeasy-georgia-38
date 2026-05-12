import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PathSwitcher() {
  return (
    <Button asChild variant="ghost" size="sm" className="ka text-xs text-muted-foreground">
      <Link to="/learning-path">↺ მიმართულების შეცვლა</Link>
    </Button>
  );
}
