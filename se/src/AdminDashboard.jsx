import { useState } from "react";
import NotificationBell from "./NotificationBell";
import { ProjectPortfolios } from "./ProfilePage";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./portal-dashboard.css";

const BAR_COLORS = ["#3b82f6", "#10b981", "#f97316"];

function AdminDashboard({ user, onLogout }) {
  const [adminSection, setAdminSection] = useState("employers");

  function loadEmployers() {
    const users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    const savedStatuses =
      JSON.parse(localStorage.getItem("employerStatuses")) || {};

    return users
      .filter((user) => user.role === "Employer")
      .map((user) => ({
        id: user.email,
        companyName: user.companyName,
        email: user.email,
        industry: user.industry || "Not added",
        status: savedStatuses[user.email] || user.status || "Pending",
        documents: user.documents || [],
      }));
  }

  const [employers, setEmployers] = useState(loadEmployers);

  function updateEmployerStatus(email, newStatus) {
    const updated = employers.map((e) =>
      e.email === email ? { ...e, status: newStatus } : e
    );

    setEmployers(updated);

    const users = JSON.parse(localStorage.getItem("registeredUsers")) || [];

    const updatedUsers = users.map((user) =>
      user.email === email ? { ...user, status: newStatus } : user
    );

    localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers));

    const savedStatuses =
      JSON.parse(localStorage.getItem("employerStatuses")) || {};

    savedStatuses[email] = newStatus;
    localStorage.setItem("employerStatuses", JSON.stringify(savedStatuses));
  }

  let pending = 0;
  let accepted = 0;
  let rejected = 0;

  employers.forEach((e) => {
    if (e.status === "Pending") pending++;
    else if (e.status === "Accepted") accepted++;
    else if (e.status === "Rejected") rejected++;
  });

  function badgeClass(status) {
    if (status === "Accepted") return "pd-badge pd-badge--accepted";
    if (status === "Rejected") return "pd-badge pd-badge--rejected";
    return "pd-badge pd-badge--pending";
  }

  const users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
  const internships = JSON.parse(localStorage.getItem("internships")) || [];
  const applications = JSON.parse(localStorage.getItem("applications")) || [];
  const projects = JSON.parse(localStorage.getItem("projects")) || [];

  const completedStudents = new Set(
    applications
      .filter((a) => a.completed && a.status === "Accepted")
      .map((a) => a.studentEmail)
  ).size;

  const totalInternships = internships.length;

  const totalUsers = users.length;

  const totalStudents = users.filter((u) => u.role === "Student").length;

  const totalEmployers = users.filter((u) => u.role === "Employer").length;

  const totalInstructors = users.filter(
    (u) => u.role === "Course Instructor"
  ).length;

  const totalProjects = projects.length;

  const totalCourses = new Set(
    projects.map((p) => p.course).filter((course) => course)
  ).size;

  const userChartData = [
    { role: "Students", count: totalStudents },
    { role: "Employers", count: totalEmployers },
    { role: "Instructors", count: totalInstructors },
  ];

  return (
    <div className="pd-page">
      <nav className="pd-nav pd-nav--app">
        <span className="pd-nav-brand">GUC Admin Portal</span>

        <div className="pd-nav-actions">
          <NotificationBell user={user} />

          <button
            type="button"
            className="pd-btn pd-btn--logout"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </nav>

      <main
        className={
          adminSection === "projects" ? "pd-main pd-main--wide" : "pd-main"
        }
      >
        <header className="pd-page-header">
          <h1 className="pd-page-title">Admin dashboard</h1>

          <p className="pd-page-subtitle">
            {adminSection === "employers"
              ? "Review employer applications, monitor platform usage, open verification documents, and set approval status."
              : "Search, sort, and open student project portfolios."}
          </p>
        </header>

        {adminSection === "employers" ? (
          <>
            <section className="pd-stat-grid" aria-label="Employer summary">
              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{pending}</h3>
                <p className="pd-stat-label">Pending employer applications</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{accepted}</h3>
                <p className="pd-stat-label">Accepted employers</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{rejected}</h3>
                <p className="pd-stat-label">Rejected employers</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{employers.length}</h3>
                <p className="pd-stat-label">Total employers</p>
              </div>
            </section>

            <section className="pd-stat-grid" aria-label="Platform usage statistics">
              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{totalUsers}</h3>
                <p className="pd-stat-label">Total platform users</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{totalStudents}</h3>
                <p className="pd-stat-label">Registered students</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{totalEmployers}</h3>
                <p className="pd-stat-label">Registered employers</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{totalInstructors}</h3>
                <p className="pd-stat-label">Course instructors</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{totalProjects}</h3>
                <p className="pd-stat-label">Total projects on the platform</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{totalCourses}</h3>
                <p className="pd-stat-label">Courses represented by projects</p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{completedStudents}</h3>
                <p className="pd-stat-label">
                  Students completed internships through the platform
                </p>
              </div>

              <div className="pd-stat-card">
                <h3 className="pd-stat-num">{totalInternships}</h3>
                <p className="pd-stat-label">
                  Total internships offered through the platform
                </p>
              </div>
            </section>

            <section className="pd-glass-panel" style={{ marginTop: 24 }}>
              <h2 className="pd-panel-title">User distribution overview</h2>
              <p className="pd-page-subtitle" style={{ marginTop: -8, marginBottom: 18 }}>
                Compare the number of registered students, employers, and course instructors.
              </p>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={userChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.08)"
                    />

                    <XAxis
                      dataKey="role"
                      stroke="#94a3b8"
                      tick={{ fill: "#cbd5e1", fontSize: 13 }}
                    />

                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: "#cbd5e1", fontSize: 13 }}
                      allowDecimals={false}
                    />

                    <Tooltip
                      formatter={(value) => [`${value} users`, "Count"]}
                      cursor={{ fill: "rgba(99, 102, 241, 0.12)" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.14)",
                        borderRadius: 12,
                        color: "#f8fafc",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                      }}
                      labelStyle={{ color: "#bfdbfe", fontWeight: 700 }}
                    />

                    <Bar
                      dataKey="count"
                      name="Users"
                      radius={[10, 10, 0, 0]}
                    >
                      {userChartData.map((entry, index) => (
                        <Cell
                          key={`bar-color-${entry.role}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        ) : null}

        <section className="pd-stat-grid" aria-label="Choose admin area">
          <button
            type="button"
            className="pd-stat-card pd-dashboard-tile"
            aria-pressed={adminSection === "employers"}
            style={
              adminSection === "employers"
                ? {
                    borderColor: "rgba(59, 130, 246, 0.5)",
                    boxShadow:
                      "0 4px 18px rgba(59, 130, 246, 0.28), 0 12px 32px rgba(0, 0, 0, 0.25)",
                  }
                : undefined
            }
            onClick={() => setAdminSection("employers")}
          >
            <p
              style={{
                margin: 0,
                fontSize: "2rem",
                lineHeight: 1,
              }}
              aria-hidden
            >
              📋
            </p>

            <p
              className="pd-stat-label"
              style={{
                fontSize: "1.05rem",
                fontWeight: 800,
                color: "#f1f5f9",
                marginTop: 10,
              }}
            >
              Employer applications
            </p>

            <p className="pd-page-subtitle" style={{ marginTop: 8 }}>
              Verification, documents, approval status, and platform statistics.
            </p>
          </button>

          <button
            type="button"
            className="pd-stat-card pd-dashboard-tile"
            aria-pressed={adminSection === "projects"}
            style={
              adminSection === "projects"
                ? {
                    borderColor: "rgba(59, 130, 246, 0.5)",
                    boxShadow:
                      "0 4px 18px rgba(59, 130, 246, 0.28), 0 12px 32px rgba(0, 0, 0, 0.25)",
                  }
                : undefined
            }
            onClick={() => setAdminSection("projects")}
          >
            <p
              style={{
                margin: 0,
                fontSize: "2rem",
                lineHeight: 1,
              }}
              aria-hidden
            >
              📁
            </p>

            <p
              className="pd-stat-label"
              style={{
                fontSize: "1.05rem",
                fontWeight: 800,
                color: "#f1f5f9",
                marginTop: 10,
              }}
            >
              Project Portfolios
            </p>

            <p className="pd-page-subtitle" style={{ marginTop: 8 }}>
              Search, sort, and open portfolios.
            </p>
          </button>
        </section>

        {adminSection === "employers" ? (
          <section className="pd-glass-panel">
            <h2 className="pd-panel-title">Employer applications</h2>

            {employers.length === 0 ? (
              <p className="pd-empty">No employer applications yet.</p>
            ) : (
              employers.map((e) => (
                <article key={e.email} className="pd-app-card">
                  <div className="pd-app-card-head">
                    <div>
                      <h3 className="pd-company-title">{e.companyName}</h3>
                      <p className="pd-muted">{e.email}</p>
                    </div>

                    <span className={badgeClass(e.status)}>{e.status}</span>
                  </div>

                  <div className="pd-info-grid">
                    <div className="pd-info-cell">
                      <span className="pd-info-cell-label">Industry</span>
                      <span className="pd-info-cell-value">{e.industry}</span>
                    </div>

                    <div className="pd-info-cell">
                      <span className="pd-info-cell-label">Verification</span>
                      <span className="pd-info-cell-value">{e.status}</span>
                    </div>
                  </div>

                  <div className="pd-docs-box">
                    <h4 className="pd-docs-title">Uploaded documents</h4>

                    {e.documents.length === 0 ? (
                      <p className="pd-empty">No documents uploaded.</p>
                    ) : (
                      e.documents.map((doc, i) => (
                        <div key={i} className="pd-doc-row">
                          <span className="pd-doc-name">{doc.name}</span>

                          <div className="pd-inline-actions">
                            <button
                              type="button"
                              className="pd-btn pd-btn--primary"
                              onClick={() => {
                                const pdfWindow = window.open("");

                                if (pdfWindow) {
                                  pdfWindow.document.write(
                                    `<iframe width="100%" height="100%" src="${doc.data}"></iframe>`
                                  );
                                }
                              }}
                            >
                              View
                            </button>

                            <a href={doc.data} download={doc.name}>
                              <button
                                type="button"
                                className="pd-btn pd-btn--ghost"
                              >
                                Download
                              </button>
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pd-action-row">
                    <button
                      type="button"
                      className="pd-btn pd-btn--success"
                      onClick={() => updateEmployerStatus(e.email, "Accepted")}
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      className="pd-btn pd-btn--danger"
                      onClick={() => updateEmployerStatus(e.email, "Rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                className="pp-btn-press"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 12,
                  padding: "10px 18px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                }}
                onClick={() => setAdminSection("employers")}
              >
                ← Back
              </button>
            </div>

            <ProjectPortfolios user={user} />
          </>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
