import { NavLink } from "react-router-dom";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const link = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
    isActive ? "bg-forest text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md" data-testid="app-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2" data-testid="header-logo-link">
          <span className="grid size-9 place-items-center rounded-xl bg-leaf text-white">
            <Leaf className="size-5" aria-hidden />
          </span>
          <span className="hidden font-heading text-lg font-semibold tracking-tight sm:inline">Dispensa Intelligente</span>
        </NavLink>
        <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1" aria-label="Sezioni">
          <NavLink to="/" end className={link} data-testid="nav-study-link">
            Studio
          </NavLink>
          <NavLink to="/prototipo" className={link} data-testid="nav-prototype-link">
            Prototipo
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
