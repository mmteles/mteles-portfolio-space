import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResumeDownload = () => {
    const link = document.createElement("a");
    link.href = "/resume/Mauricio_Teles_Functional_Full.docx";
    link.download = "Mauricio_Teles_Resume.docx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-background border-b transition-shadow duration-200",
        scrolled ? "shadow-sm" : "shadow-none"
      )}
    >
      <div className="section-container flex items-center justify-between h-14">
        {/* Logo mark */}
        <Link
          to="/"
          className="font-serif text-lg font-bold text-foreground tracking-tight hover:opacity-80 transition-opacity"
        >
          MT
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "relative text-sm font-medium transition-colors group",
                location.pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
              <span
                className={cn(
                  "absolute -bottom-0.5 left-0 h-px bg-foreground transition-all duration-200",
                  location.pathname === link.href
                    ? "w-full"
                    : "w-0 group-hover:w-full"
                )}
              />
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "relative text-sm font-medium transition-colors group",
                location.pathname === "/admin"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Admin
              <span
                className={cn(
                  "absolute -bottom-0.5 left-0 h-px bg-foreground transition-all duration-200",
                  location.pathname === "/admin"
                    ? "w-full"
                    : "w-0 group-hover:w-full"
                )}
              />
            </Link>
          )}
          <button
            onClick={handleResumeDownload}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Resume
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-background border-t">
          <div className="section-container py-5 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "text-sm font-medium transition-colors",
                  location.pathname === link.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-muted-foreground"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => {
                handleResumeDownload();
                setIsOpen(false);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <Download className="h-3.5 w-3.5" />
              Resume
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
