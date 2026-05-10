import { useNavigate } from "react-router-dom";
import "./login.css";

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <main className="insta-page welcome-page">
      <section className="welcome-hero-wrap" aria-label="Welcome">
        <div className="welcome-hero">
          <header className="auth-brand welcome-brand" aria-label="GUC branding">
            <p className="guc-wordmark">GUC</p>
            <p className="slogan-main">
              <strong>Education</strong>, <strong>Cultivation</strong>,{" "}
              <strong>Advancement</strong>
            </p>
          </header>

          <p className="welcome-subline">
            Sign in to your account or create a new one to get started.
          </p>

          <div className="welcome-actions">
            <button
              type="button"
              className="login-btn welcome-primary"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className="outline-btn welcome-secondary"
              onClick={() => navigate("/register")}
            >
              Create an account
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
