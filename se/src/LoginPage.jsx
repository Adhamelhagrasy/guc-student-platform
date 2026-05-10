import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  REGISTERED_USERS_STORAGE_KEY,
  getEmailRule,
  isEmailValidForRole,
  loadRegisteredUsers,
} from "./authUtils";
import "./login.css";

const HARDCODED_OTP = "123456";

const ADMIN_EMAIL = "admin@guc.edu.eg";
const ADMIN_PASSWORD = "1234";

export default function LoginPage({ onLogin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(() => {
    const msg = location.state?.registrationSuccess;
    return typeof msg === "string" && msg.length > 0 ? msg : "";
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [registeredUsers, setRegisteredUsers] = useState(() =>
    loadRegisteredUsers()
  );
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    localStorage.setItem(
      REGISTERED_USERS_STORAGE_KEY,
      JSON.stringify(registeredUsers)
    );
  }, [registeredUsers]);

  useEffect(() => {
    const msg = location.state?.registrationSuccess;
    if (typeof msg === "string" && msg.length > 0) {
      navigate("/login", { replace: true, state: null });
    }
  }, [location.state, navigate]);

  function clearMessages() {
    setSuccess("");
    setFieldErrors({});
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    clearMessages();
    setEmail("");
    setPassword("");
    setOtpSent(false);
    setOtpCode("");
    setOtpInput("");
    setNewPassword("");
  }

  function findUserByEmail(targetEmail) {
    const normalizedEmail = targetEmail.trim().toLowerCase();

    return registeredUsers.find((user) => user.email === normalizedEmail);
  }

  function handleSendOtp() {
    clearMessages();

    if (!email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return;
    }

    const user = findUserByEmail(email);

    if (!user) {
      setFieldErrors({ email: "This account is not registered yet." });
      return;
    }

    if (user.role === "Administrator") {
      setFieldErrors({ email: "Administrator password cannot be reset." });
      return;
    }

    setOtpCode(HARDCODED_OTP);
    setOtpSent(true);
    setSuccess(`OTP sent. Demo OTP: ${HARDCODED_OTP}`);
  }

  function handleResetPassword(event) {
    event.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return;
    }

    const user = findUserByEmail(email);

    if (!user) {
      setFieldErrors({ email: "This account is not registered yet." });
      return;
    }

    if (!otpSent) {
      setFieldErrors({ otp: "Please send OTP first." });
      return;
    }

    if (!otpInput.trim()) {
      setFieldErrors({ otp: "OTP code is required." });
      return;
    }

    if (otpInput.trim() !== otpCode) {
      setFieldErrors({ otp: "Invalid OTP code." });
      return;
    }

    if (!newPassword) {
      setFieldErrors({ newPassword: "New password is required." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setRegisteredUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.email === normalizedEmail
          ? { ...currentUser, password: newPassword }
          : currentUser
      )
    );

    setOtpSent(false);
    setOtpCode("");
    setOtpInput("");
    setNewPassword("");
    setPassword("");
    setMode("login");
    setSuccess("Password updated successfully. You can now log in.");
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return;
    }

    if (!password) {
      setFieldErrors({ password: "Password is required." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === ADMIN_EMAIL) {
      if (password !== ADMIN_PASSWORD) {
        setFieldErrors({
          password:
            "Wrong password for this administrator account. Try again or use Forgot password.",
        });
        return;
      }

      onLogin({
        role: "Administrator",
        email: ADMIN_EMAIL,
        firstName: "",
        lastName: "",
        companyName: "",
      });

      return;
    }

    const matchedUser = findUserByEmail(email);

    if (!matchedUser) {
      setFieldErrors({
        email:
          "No account found for this email. Check the address or create an account.",
      });
      return;
    }

    if (matchedUser.role === "Employer") {
      if (matchedUser.status === "Pending") {
        setFieldErrors({
          email: "Your account is pending admin approval.",
        });
        return;
      }

      if (matchedUser.status === "Rejected") {
        setFieldErrors({
          email: "Your company was rejected by the administrator.",
        });
        return;
      }
    }

    if (
      matchedUser.role !== "Employer" &&
      !isEmailValidForRole(email, matchedUser.role)
    ) {
      setFieldErrors({ email: getEmailRule(matchedUser.role) });
      return;
    }

    if (matchedUser.password !== password) {
      setFieldErrors({
        password:
          "Wrong password for this account. Try again or use Forgot password.",
      });
      return;
    }

    onLogin(matchedUser);
  }

  const authEyebrow =
    mode === "forgot" ? "Account recovery" : "Welcome back";

  const authSubtitle =
    mode === "forgot"
      ? "Enter the email on your account, send the one-time code, then choose a new password."
      : "Sign in with your GUC email and password. Employers may use a company email if registered.";

  return (
    <main className="insta-page">
      <header className="auth-brand" aria-label="GUC branding">
        <p className="guc-wordmark">GUC</p>
        <p className="slogan-main">
          <strong>Education</strong>, <strong>Cultivation</strong>,{" "}
          <strong>Advancement</strong>
        </p>
      </header>

      <section className="auth-layout">
        <div className="login-box">
          <div className="auth-card">
            <header className="auth-header">
              <p className="auth-eyebrow">{authEyebrow}</p>
              <h2>
                {mode === "forgot" ? "Reset your password" : "GUC Portal sign in"}
              </h2>
              <p className="auth-subtitle">{authSubtitle}</p>
            </header>

            {mode === "forgot" && (
              <div className="forgot-strip">
                <span>Password reset mode</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => switchMode("login")}
                >
                  Back to sign in
                </button>
              </div>
            )}

            {mode === "login" && (
              <p className="auth-alt-nav">
                Need an account?{" "}
                <Link to="/register" className="auth-inline-link">
                  Create one
                </Link>
              </p>
            )}

            <form
              onSubmit={mode === "forgot" ? handleResetPassword : handleSubmit}
              className="form"
            >
              <div className="form-field">
                <label className="form-label" htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  className={fieldErrors.email ? "input-error" : ""}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => {
                      if (!prev.email) return prev;
                      const next = { ...prev };
                      delete next.email;
                      return next;
                    });
                  }}
                  placeholder="you@example.com"
                  aria-invalid={fieldErrors.email ? "true" : "false"}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p className="field-error" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {mode === "forgot" ? (
                <>
                  <p className="forgot-steps">
                    Use the email tied to your account. In this demo, the OTP
                    appears on screen after you tap Send OTP.
                  </p>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={handleSendOtp}
                  >
                    Send OTP
                  </button>

                  <div className="form-field">
                    <label className="form-label" htmlFor="auth-otp">
                      One-time code
                    </label>
                    <input
                      id="auth-otp"
                      className={fieldErrors.otp ? "input-error" : ""}
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit code"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      autoComplete="one-time-code"
                    />
                    {fieldErrors.otp && (
                      <p className="field-error" role="alert">
                        {fieldErrors.otp}
                      </p>
                    )}
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="auth-new-password">
                      New password
                    </label>
                    <input
                      id="auth-new-password"
                      className={fieldErrors.newPassword ? "input-error" : ""}
                      type="password"
                      placeholder="Choose a new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    {fieldErrors.newPassword && (
                      <p className="field-error" role="alert">
                        {fieldErrors.newPassword}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="form-field">
                    <label className="form-label" htmlFor="auth-password">
                      Password
                    </label>
                    <input
                      id="auth-password"
                      className={fieldErrors.password ? "input-error" : ""}
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => {
                          if (!prev.password) return prev;
                          const next = { ...prev };
                          delete next.password;
                          return next;
                        });
                      }}
                      placeholder="Your password"
                      aria-invalid={fieldErrors.password ? "true" : "false"}
                      autoComplete="current-password"
                    />
                    {fieldErrors.password && (
                      <p className="field-error" role="alert">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="forgot-row">
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => switchMode("forgot")}
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              )}

              {success && (
                <p className="form-success" role="status">
                  {success}
                </p>
              )}

              <button type="submit" className="login-btn">
                {mode === "forgot" ? "Save new password" : "Sign in"}
              </button>
            </form>

            <p className="auth-footer-link">
              <Link to="/" className="auth-inline-link">
                Back to welcome
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
