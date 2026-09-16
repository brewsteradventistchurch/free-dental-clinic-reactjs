import { useAuth } from "../auth/AuthContext";

export default function WelcomePage() {
  const { login } = useAuth();

  function handleLogin() {
    login();
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-mark">+</div>

        <span className="eyebrow">Omak Adventist Church</span>

        <h1>Free Dental Clinic</h1>

        <p className="login-description">
          Volunteer portal for the annual community dental clinic.
        </p>

        <button className="google-button" onClick={handleLogin}>
          <span className="google-icon">G</span>
          Continue with Google
        </button>

        <p className="login-note">
          Authorized clinic volunteers only.
        </p>
      </div>
    </main>
  );
}