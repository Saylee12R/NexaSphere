import { useStudentAuth } from '../../context/StudentAuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login, user, logout } = useStudentAuth();

  if (user) {
    return (
      <main className={styles.container} role="main" aria-label="Account management">
        <div className={styles.card}>
          <h1 className={styles.heading}>Welcome, {user.name || user.email}</h1>
          <p className={styles.text}>
            You are signed in as <strong>{user.role}</strong>.
          </p>
          <button
            type="button"
            className={styles.btnDanger}
            onClick={logout}
            aria-label="Sign out of NexaSphere"
          >
            Sign Out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container} role="main" aria-label="Sign in">
      <div className={styles.card}>
        <h1 className={styles.heading}>Sign In to NexaSphere</h1>
        <p className={styles.text}>Choose your preferred sign-in method</p>
        <div className={styles.buttons} role="group" aria-label="Sign-in options">
          <button
            type="button"
            className={styles.btnGoogle}
            onClick={() => login('google')}
            aria-label="Sign in with Google OAuth"
          >
            <span className={styles.btnIcon} aria-hidden="true">
              G
            </span>
            Sign in with Google
          </button>
          <button
            type="button"
            className={styles.btnGitHub}
            onClick={() => login('github')}
            aria-label="Sign in with GitHub OAuth"
          >
            <span className={styles.btnIcon} aria-hidden="true">
              &#xf09b;
            </span>
            Sign in with GitHub
          </button>
        </div>
      </div>
    </main>
  );
}
