import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { logout } from '@/api/auth';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user, isAdmin, clearUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navClass = (path: string) => {
    const active = pathname.startsWith(path);
    return cn(
      'rounded-[10px] px-3 py-2 text-base text-foreground transition-colors max-md:rounded-none max-md:px-4 max-md:py-4 max-md:text-base max-md:border-b max-md:border-border',
      active ? 'bg-[#0ea5e9]/[0.14] border border-[#0ea5e9]/50 max-md:border-l-2 max-md:border-l-[#0ea5e9]' : 'hover:bg-surface-hover',
    );
  };

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    clearUser();
    navigate('/login');
  };

  return (
    <header className="relative z-50">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-2 py-4">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 text-foreground no-underline">
          <div className="size-11 rounded-[10px] bg-card border border-border shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden grid place-items-center shrink-0">
            <img src="/logo.png" alt="" className="w-full h-full object-cover block" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[18px] font-bold tracking-tight">Schautrack</span>
            <span className="text-[13px] text-muted-foreground">Every day counts</span>
          </div>
        </Link>

        {user ? (
          <>
            <button
              type="button"
              className="z-[102] flex flex-col gap-1 p-2 md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className={cn('block h-0.5 w-5 rounded bg-foreground transition-transform', menuOpen && 'translate-x-0 translate-y-[3px] rotate-45')} />
              <span className={cn('block h-0.5 w-5 rounded bg-foreground transition-opacity', menuOpen && 'opacity-0')} />
              <span className={cn('block h-0.5 w-5 rounded bg-foreground transition-transform', menuOpen && '-translate-y-[3px] -rotate-45')} />
            </button>

            <nav className={cn(
              'flex items-center gap-1',
              'max-md:fixed max-md:right-0 max-md:top-0 max-md:z-[101] max-md:h-screen max-md:w-[280px] max-md:translate-x-full max-md:invisible max-md:flex-col max-md:items-stretch max-md:border-l max-md:border-border max-md:bg-background max-md:pt-16 max-md:transition-[transform,visibility] max-md:duration-250',
              menuOpen && 'max-md:translate-x-0 max-md:visible'
            )}>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className={navClass('/admin')}>
                  Admin
                </Link>
              )}
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className={navClass('/dashboard')}>
                Dashboard
              </Link>
              <Link to="/settings" onClick={() => setMenuOpen(false)} className={navClass('/settings')}>
                Settings
              </Link>
              <button type="button" onClick={handleLogout}
                className="cursor-pointer rounded-md border-none bg-transparent px-3 py-2 text-left text-base font-inherit text-foreground transition-colors hover:bg-surface-hover max-md:border-b max-md:border-border max-md:rounded-none max-md:px-4 max-md:py-4 max-md:text-base">
                Logout
              </button>
            </nav>

            {menuOpen && (
              <div className="fixed inset-0 z-[100] bg-black/50 md:hidden" onClick={() => setMenuOpen(false)} />
            )}
          </>
        ) : (
          <nav className="flex items-center gap-1">
            <Link to="/login"
              className="rounded-md px-3 py-2 text-base text-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              Login
            </Link>
            <Link to="/register"
              className="rounded-md px-3 py-2 text-base text-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              Register
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
