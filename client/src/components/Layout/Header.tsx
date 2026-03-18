import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { logout } from '@/api/auth';
import styles from './Header.module.css';

export default function Header() {
  const { user, isAdmin, clearUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch { /* ignore */ }
    clearUser();
    navigate('/login');
  };

  return (
    <header className={styles.topBar}>
      <div className={styles.inner}>
        <Link to={user ? '/dashboard' : '/'} className={styles.brand}>
          <img src="/logo.png" alt="" width={28} height={28} className={styles.logo} />
          <span className={styles.brandName}>Schautrack</span>
        </Link>

        {user && (
          <>
            <button
              type="button"
              className={styles.hamburger}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`${styles.bar} ${menuOpen ? styles.barOpen : ''}`} />
              <span className={`${styles.bar} ${menuOpen ? styles.barOpen : ''}`} />
              <span className={`${styles.bar} ${menuOpen ? styles.barOpen : ''}`} />
            </button>

            <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
              {isAdmin && (
                <Link to="/admin" className={styles.navLink} onClick={() => setMenuOpen(false)}>Admin</Link>
              )}
              <Link to="/dashboard" className={styles.navLink} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/settings" className={styles.navLink} onClick={() => setMenuOpen(false)}>Settings</Link>
              <button type="button" className={styles.navLink} onClick={handleLogout}>Logout</button>
            </nav>

            {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}
          </>
        )}
      </div>
    </header>
  );
}
