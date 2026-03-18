import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { logout } from '@/api/auth';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user, isAdmin, clearUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    clearUser();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 text-foreground no-underline">
          <img src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="text-lg font-semibold tracking-tight">Schautrack</span>
        </Link>

        {user && (
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
              'max-md:fixed max-md:right-[-280px] max-md:top-0 max-md:z-[101] max-md:h-screen max-md:w-[280px] max-md:flex-col max-md:items-stretch max-md:border-l max-md:border-border max-md:bg-background max-md:pt-16 max-md:transition-[right] max-md:duration-250',
              menuOpen && 'max-md:right-0'
            )}>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground max-md:border-b max-md:border-border max-md:rounded-none max-md:px-4 max-md:py-4 max-md:text-base">
                  Admin
                </Link>
              )}
              <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground max-md:border-b max-md:border-border max-md:rounded-none max-md:px-4 max-md:py-4 max-md:text-base">
                Dashboard
              </Link>
              <Link to="/settings" onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground max-md:border-b max-md:border-border max-md:rounded-none max-md:px-4 max-md:py-4 max-md:text-base">
                Settings
              </Link>
              <button type="button" onClick={handleLogout}
                className="cursor-pointer rounded-md border-none bg-transparent px-3 py-2 text-left text-sm font-inherit text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground max-md:border-b max-md:border-border max-md:rounded-none max-md:px-4 max-md:py-4 max-md:text-base">
                Logout
              </button>
            </nav>

            {menuOpen && (
              <div className="fixed inset-0 z-[100] bg-black/50 md:hidden" onClick={() => setMenuOpen(false)} />
            )}
          </>
        )}
      </div>
    </header>
  );
}
