import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  REGISTER_ROLES,
  REGISTERED_USERS_STORAGE_KEY,
  getEmailRule,
  isEmailValidForRole,
  loadRegisteredUsers,
  saveDocsToUserProfile,
} from "./authUtils";
import "./login.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("Student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDocs, setCompanyDocs] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [registeredUsers, setRegisteredUsers] = useState(() =>
    loadRegisteredUsers()
  );

  const isEmployerRegister = role === "Employer";

  useEffect(() => {
    localStorage.setItem(
      REGISTERED_USERS_STORAGE_KEY,
      JSON.stringify(registeredUsers)
    );
  }, [registeredUsers]);

  function clearMessages() {
    setFieldErrors({});
  }

  function handleCompanyDocsUpload(event) {
    const files = Array.from(event.target.files);

    if (files.length === 0) {
      setCompanyDocs([]);
      return;
    }

    const invalidFile = files.find((file) => file.type !== "application/pdf");

    if (invalidFile) {
      setFieldErrors({
        companyDocs: "Only PDF documents are allowed.",
      });
      setCompanyDocs([]);
      return;
    }

    const tooLargeFile = files.find((file) => file.size > 5 * 1024 * 1024);

    if (tooLargeFile) {
      setFieldErrors({
        companyDocs: "Each PDF must be less than 5MB.",
      });
      setCompanyDocs([]);
      return;
    }

    const readers = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          resolve({
            name: file.name,
            data: e.target.result,
            uploadedAt: new Date().toLocaleDateString(),
          });
        };

        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((docs) => {
      setCompanyDocs(docs);
      setFieldErrors({});
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearMessages();

    if (role === "Employer") {
      if (!companyName.trim()) {
        setFieldErrors({ companyName: "Company name is required." });
        return;
      }

      if (companyDocs.length === 0) {
        setFieldErrors({
          companyDocs:
            "Company verification documents are required for admin approval.",
        });
        return;
      }
    } else {
      if (!firstName.trim()) {
        setFieldErrors({ firstName: "First name is required." });
        return;
      }

      if (!lastName.trim()) {
        setFieldErrors({ lastName: "Last name is required." });
        return;
      }
    }

    if (!email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return;
    }

    if (!isEmailValidForRole(email, role)) {
      setFieldErrors({ email: getEmailRule(role) });
      return;
    }

    if (!password) {
      setFieldErrors({ password: "Password is required." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userAlreadyRegistered = registeredUsers.some(
      (user) => user.email === normalizedEmail
    );

    if (userAlreadyRegistered) {
      setFieldErrors({
        email: "This account is already registered. Please log in.",
      });
      return;
    }

    const newUser = {
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName.trim(),
      email: normalizedEmail,
      password,
      status: role === "Employer" ? "Pending" : "Accepted",
      documents: role === "Employer" ? companyDocs : [],
    };

    setRegisteredUsers((currentUsers) => [...currentUsers, newUser]);

    if (role === "Employer") {
      saveDocsToUserProfile(normalizedEmail, companyName.trim(), companyDocs);
    }

    const message = `${role} account created. You can log in now.`;
    navigate("/login", {
      replace: true,
      state: { registrationSuccess: message },
    });
  }

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
              <p className="auth-eyebrow">New here</p>
              <h2>Create your account</h2>
              <p className="auth-subtitle">
                Choose your role, fill in your details, and you will be signed
                in after approval rules apply.
              </p>
            </header>

            <p className="auth-alt-nav">
              Already have an account?{" "}
              <Link to="/login" className="auth-inline-link">
                Sign in
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-field">
                <label className="form-label" htmlFor="reg-auth-role">
                  I am registering as
                </label>
                <select
                  id="reg-auth-role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setFieldErrors({});
                    setCompanyDocs([]);
                  }}
                >
                  {REGISTER_ROLES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>

              {isEmployerRegister ? (
                <>
                  <div className="form-field">
                    <label className="form-label" htmlFor="reg-company">
                      Company name
                    </label>
                    <input
                      id="reg-company"
                      className={fieldErrors.companyName ? "input-error" : ""}
                      type="text"
                      placeholder="e.g. Nile Tech Solutions"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      autoComplete="organization"
                    />
                    {fieldErrors.companyName && (
                      <p className="field-error" role="alert">
                        {fieldErrors.companyName}
                      </p>
                    )}
                  </div>

                  <div className="upload-block">
                    <p className="upload-heading">
                      Company verification (PDF)
                    </p>
                    <p className="upload-hint">
                      Upload tax certificate, commercial register, or license.
                      PDF only, max 5MB each. Required for admin approval.
                    </p>
                    <input
                      className={fieldErrors.companyDocs ? "input-error" : ""}
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleCompanyDocsUpload}
                      aria-invalid={fieldErrors.companyDocs ? "true" : "false"}
                    />
                    {fieldErrors.companyDocs && (
                      <p className="field-error" role="alert">
                        {fieldErrors.companyDocs}
                      </p>
                    )}
                    {companyDocs.length > 0 && (
                      <div className="doc-list">
                        {companyDocs.map((doc, index) => (
                          <p key={index} className="doc-row">
                            {doc.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="form-label" htmlFor="reg-first">
                      First name
                    </label>
                    <input
                      id="reg-first"
                      className={fieldErrors.firstName ? "input-error" : ""}
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                    {fieldErrors.firstName && (
                      <p className="field-error" role="alert">
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="reg-last">
                      Last name
                    </label>
                    <input
                      id="reg-last"
                      className={fieldErrors.lastName ? "input-error" : ""}
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                    {fieldErrors.lastName && (
                      <p className="field-error" role="alert">
                        {fieldErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="form-field">
                <label className="form-label" htmlFor="reg-auth-email">
                  Email
                </label>
                <input
                  id="reg-auth-email"
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
                  aria-describedby="reg-email-rule-text"
                />
                {fieldErrors.email && (
                  <p className="field-error" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <p
                id="reg-email-rule-text"
                className="email-rule"
                aria-live="polite"
              >
                {role === "Employer"
                  ? "Employers may use a GUC email or a valid company email."
                  : "Students and instructors must use an address ending in @guc.edu.eg."}
              </p>

              <div className="form-field">
                <label className="form-label" htmlFor="reg-auth-password">
                  Password
                </label>
                <input
                  id="reg-auth-password"
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
                  autoComplete="new-password"
                />
                {fieldErrors.password && (
                  <p className="field-error" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button type="submit" className="login-btn">
                Create account
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
