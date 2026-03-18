import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.quote}>You got this. Trust me.</p>
      <div className={styles.links}>
        <a href="/privacy" className={styles.link}>Privacy</a>
        <a href="/terms" className={styles.link}>Terms</a>
        <a href="/imprint" className={styles.link}>Imprint</a>
      </div>
    </footer>
  );
}
