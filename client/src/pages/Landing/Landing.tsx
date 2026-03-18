import { Link } from 'react-router';
import Button from '@/components/ui/Button';
import styles from './Landing.module.css';

export default function Landing() {
  return (
    <div className={styles.landing}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Track your nutrition,<br />your way.</h1>
        <p className={styles.subtitle}>
          Simple calorie and macro tracking with AI-powered food estimation.
          Self-hostable and privacy-first.
        </p>
        <div className={styles.actions}>
          <Link to="/register"><Button>Get Started</Button></Link>
          <Link to="/login"><Button variant="ghost">Log In</Button></Link>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <h3>Simple Logging</h3>
          <p>Log calories and macros in seconds. Math expressions supported.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>AI Estimation</h3>
          <p>Snap a photo and let AI estimate calories and macros for you.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>Share with Friends</h3>
          <p>Link accounts and see each other's daily progress.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>Self-Hostable</h3>
          <p>Run your own instance. Your data stays with you.</p>
        </div>
      </section>
    </div>
  );
}
