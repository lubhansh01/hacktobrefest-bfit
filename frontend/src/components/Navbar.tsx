import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signInWithGoogle, signOut, displayName, photoURL, type User } from "../lib/supabase";
import { cn } from "../lib/utils";
import { Menu, X, LogIn, ShieldCheck, LayoutDashboard, UserCheck, Terminal } from "lucide-react";

export default function Navbar({ user, isAdmin, isMentor }: { user: User | null; isAdmin: boolean; isMentor: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  // Solid bar once scrolled so the hero art never bleeds through the links.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on navigation, otherwise it hangs over the new page.
  useEffect(() => setIsOpen(false), [pathname, hash]);

  const handleLogin = async () => {
    try {
      // Redirects to Google and returns to the current page.
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
    navigate("/");
  };

  const navLink = (to: string, label: string, active: boolean) => (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative text-[14px] font-medium tracking-wide transition-colors py-2",
        active ? "text-white" : "text-white/55 hover:text-white"
      )}
    >
      {label}
      {active && <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-accent-400" />}
    </Link>
  );

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-accent-500 focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold"
      >
        Skip to content
      </a>

      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-colors duration-300 border-b",
          scrolled ? "bg-canvas/90 backdrop-blur-xl border-white/10" : "bg-transparent border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 md:h-18 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="w-9 h-9 rounded-xl bg-accent-500 text-black flex items-center justify-center group-hover:rotate-6 transition-transform">
              <Terminal className="w-[18px] h-[18px]" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display font-bold text-[16px] tracking-tight">Hacktoberfest</span>
              <span className="font-mono text-[10px] tracking-[0.22em] text-accent-400 uppercase">Dehradun</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLink("/tracks", "Tracks", pathname === "/tracks")}
            {navLink("/schedule", "Schedule", pathname === "/schedule")}
            {navLink("/about", "About", pathname === "/about")}
            {navLink("/register", "Register", pathname === "/register")}
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1.5 text-[14px] font-medium text-accent-400 hover:text-accent-300 transition-colors">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Admin
              </Link>
            )}
            {isMentor && (
              <Link to="/mentor" className="flex items-center gap-1.5 text-[14px] font-medium text-info-400 hover:text-info-300 transition-colors">
                <UserCheck className="w-4 h-4" aria-hidden="true" />
                Mentor
              </Link>
            )}
            {user && !isAdmin && !isMentor && (
              <Link to="/dashboard" className="flex items-center gap-1.5 text-[14px] font-medium text-white/55 hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                Dashboard
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-3 border-l border-white/10 pl-6">
                <img src={photoURL(user)} alt="" className="w-8 h-8 rounded-full border border-white/15 object-cover" />
                <div className="flex flex-col items-start">
                  <span className="text-[13px] font-medium truncate max-w-[110px] leading-tight">{displayName(user)}</span>
                  <button onClick={handleLogout} className="text-[12px] text-white/35 hover:text-red-400 transition-colors leading-tight">
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 h-9 bg-accent-500 text-black text-[14px] font-bold rounded-lg hover:bg-accent-400 transition-colors"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Sign in
              </button>
            )}
          </div>

          {/* Mobile Toggle — 44px target */}
          <button
            className="md:hidden -mr-2 w-11 h-11 flex items-center justify-center text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div id="mobile-menu" className="md:hidden bg-canvas border-b border-white/10 px-5 py-5 flex flex-col">
            <Link
              to="/tracks"
              aria-current={pathname === "/tracks" ? "page" : undefined}
              className={cn("py-3 text-base font-medium border-b border-white/5", pathname === "/tracks" ? "text-accent-400" : undefined)}
            >
              Tracks
            </Link>
            <Link
              to="/schedule"
              aria-current={pathname === "/schedule" ? "page" : undefined}
              className={cn("py-3 text-base font-medium border-b border-white/5", pathname === "/schedule" ? "text-accent-400" : undefined)}
            >
              Schedule
            </Link>
            <Link
              to="/about"
              aria-current={pathname === "/about" ? "page" : undefined}
              className={cn("py-3 text-base font-medium border-b border-white/5", pathname === "/about" ? "text-accent-400" : undefined)}
            >
              About
            </Link>
            <Link
              to="/register"
              aria-current={pathname === "/register" ? "page" : undefined}
              className={cn("py-3 text-base font-medium border-b border-white/5", pathname === "/register" ? "text-accent-400" : undefined)}
            >
              Register
            </Link>
            {isAdmin && <Link to="/admin" className="py-3 text-base font-medium text-accent-400 border-b border-white/5">Admin Panel</Link>}
            {isMentor && <Link to="/mentor" className="py-3 text-base font-medium text-info-400 border-b border-white/5">Mentor Panel</Link>}
            {user && !isAdmin && !isMentor && <Link to="/dashboard" className="py-3 text-base font-medium border-b border-white/5">Dashboard</Link>}
            {user ? (
              <button onClick={handleLogout} className="mt-4 h-12 rounded-lg border border-red-500/30 text-red-400 font-bold text-sm">
                Sign out
              </button>
            ) : (
              <button onClick={handleLogin} className="mt-4 h-12 rounded-lg bg-accent-500 text-black font-bold text-sm">
                Sign in with Google
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
