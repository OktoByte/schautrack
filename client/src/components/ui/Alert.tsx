import styles from './Alert.module.css';

interface AlertProps {
  type: 'success' | 'error' | 'warning';
  message: string;
}

export default function Alert({ type, message }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[type]}`}>
      {message}
    </div>
  );
}
