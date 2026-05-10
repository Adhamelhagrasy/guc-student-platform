import { useState } from "react";
import { appendNotification } from "./notificationsStorage";
import "./portal-dashboard.css";

function createInternshipApplicationRecord({ internship, user, letter }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    internshipId: internship.id,
    internshipTitle: internship.title,
    company: internship.company,
    studentName: `${user.firstName} ${user.lastName}`,
    studentEmail: user.email,
    coverLetter: letter,
    contributionScore: Math.floor(Math.random() * 40) + 60,
    status: "Pending",
    completed: false,
  };
}

const emptyInternshipForm = {
  title: "",
  location: "",
  type: "On-site",
  field: "",
  description: "",
  skills: "",
  duration: "",
  deadline: "",
  languages: "",
  hiringStatus: "Currently hiring",
};

function InternshipSystem({ user }) {
  const [internships, setInternships] = useState(() => {
    const saved = localStorage.getItem("internships");

    if (saved) {
      return JSON.parse(saved);
    }

    return [
      {
        id: 1,
        title: "Frontend Intern",
        company: "TechNova",
        employerEmail: "employer@company.com",
        location: "Cairo",
        type: "On-site",
        field: "Software",
        status: "Open",
        archived: false,
        description: "Work with React to build UI pages.",
        skills: "UI development, problem solving, teamwork",
        duration: "3 months",
        deadline: "2026-06-30",
        languages: "JavaScript, React, CSS",
        hiringStatus: "Currently hiring",
        postedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: 2,
        title: "Data Analyst Intern",
        company: "DataWorks",
        employerEmail: "other@company.com",
        location: "Remote",
        type: "Remote",
        field: "Data",
        status: "Closed",
        archived: false,
        description: "Analyze reports and prepare dashboards.",
        skills: "Data analysis, Excel, communication",
        duration: "2 months",
        deadline: "2026-05-30",
        languages: "Python, SQL",
        hiringStatus: "Position filled",
        postedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
  });

  const [coverLetters, setCoverLetters] = useState({});
  const [applyFieldError, setApplyFieldError] = useState(null);
  const [applySuccess, setApplySuccess] = useState(null);
  const [employerFormErrors, setEmployerFormErrors] = useState({});
  const [sortApplications, setSortApplications] = useState("top");
  const [editingInternshipId, setEditingInternshipId] = useState(null);
  const [showArchivedInternships, setShowArchivedInternships] = useState(false);

  const [applications, setApplications] = useState(() => {
    const saved = localStorage.getItem("applications");
    return saved ? JSON.parse(saved) : [];
  });

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("title");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [durationFilter, setDurationFilter] = useState("All");

  const [form, setForm] = useState(emptyInternshipForm);

  function saveInternships(updatedInternships) {
    setInternships(updatedInternships);
    localStorage.setItem("internships", JSON.stringify(updatedInternships));
  }

  function saveApplications(updatedApplications) {
    setApplications(updatedApplications);
    localStorage.setItem("applications", JSON.stringify(updatedApplications));
  }

  const ownInternships = internships.filter(
    (i) => i.employerEmail === user.email
  );

  const visibleOwnInternships = ownInternships.filter((i) =>
    showArchivedInternships ? i.archived : !i.archived
  );

  const ownInternshipIds = ownInternships.map((i) => i.id);

  const companyApplications = applications.filter((a) =>
    ownInternshipIds.includes(a.internshipId)
  );

  const favoriteProjects =
    JSON.parse(localStorage.getItem("favoriteProjects")) || {};

  const myFavoriteProjectIds = favoriteProjects[user.email] || [];

  const allProjects = JSON.parse(localStorage.getItem("projects")) || [];

  const favoriteStudentEmails = allProjects
    .filter((project) => myFavoriteProjectIds.includes(project.id))
    .map((project) => project.owner);

  const suggestedApplications = companyApplications
    .filter((application) =>
      favoriteStudentEmails.includes(application.studentEmail)
    )
    .sort((a, b) => b.contributionScore - a.contributionScore);

  const completedCompanyApplications = companyApplications.filter(
    (a) => a.completed
  );

  const completedStudentCount = new Set(
    completedCompanyApplications.map((a) => a.studentEmail)
  ).size;

  const internshipsOfferedCount = ownInternships.length;

  const openInternshipsCount = ownInternships.filter(
    (i) => i.status === "Open"
  ).length;

  const closedInternshipsCount = ownInternships.filter(
    (i) => i.status === "Closed"
  ).length;

  function clearEmployerField(key) {
    setEmployerFormErrors((prev) => {
      if (!prev[key]) return prev;

      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function resetInternshipForm() {
    setForm(emptyInternshipForm);
    setEditingInternshipId(null);
    setEmployerFormErrors({});
  }

  function validateEmployerForm() {
    const errors = {};

    if (!form.title.trim()) errors.title = "Internship title is required.";
    if (!form.location.trim()) errors.location = "Location is required.";
    if (!form.field.trim()) errors.field = "Field is required.";
    if (!form.description.trim())
      errors.description = "Responsibilities are required.";
    if (!form.skills.trim()) errors.skills = "Required skills are required.";
    if (!form.duration.trim()) errors.duration = "Duration is required.";
    if (!form.deadline.trim())
      errors.deadline = "Application deadline is required.";
    if (!form.languages.trim())
      errors.languages = "Programming languages are required.";

    return errors;
  }

  function addInternship() {
    const errors = validateEmployerForm();

    if (Object.keys(errors).length > 0) {
      setEmployerFormErrors(errors);
      return;
    }

    setEmployerFormErrors({});

    if (editingInternshipId) {
      const updatedInternships = internships.map((i) =>
        i.id === editingInternshipId
          ? {
              ...i,
              title: form.title.trim(),
              location: form.location.trim(),
              type: form.type,
              field: form.field.trim(),
              description: form.description.trim(),
              skills: form.skills.trim(),
              duration: form.duration.trim(),
              deadline: form.deadline,
              languages: form.languages.trim(),
              hiringStatus: form.hiringStatus,
      postedAt: new Date().toISOString(),
            }
          : i
      );

      saveInternships(updatedInternships);
      resetInternshipForm();
      return;
    }

    const newInternship = {
      id: Date.now(),
      title: form.title.trim(),
      company: user.companyName || "My Company",
      employerEmail: user.email,
      location: form.location.trim(),
      type: form.type,
      field: form.field.trim(),
      status: "Open",
      archived: false,
      description: form.description.trim(),
      skills: form.skills.trim(),
      duration: form.duration.trim(),
      deadline: form.deadline,
      languages: form.languages.trim(),
      hiringStatus: form.hiringStatus,
      postedAt: new Date().toISOString(),
    };

    const updatedInternships = [...internships, newInternship];
    saveInternships(updatedInternships);
    resetInternshipForm();
  }

  function deleteInternship(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this internship?"
    );

    if (!confirmDelete) return;

    const updatedInternships = internships.filter((i) => i.id !== id);
    saveInternships(updatedInternships);
  }

  function toggleStatus(id) {
    const updatedInternships = internships.map((i) =>
      i.id === id
        ? { ...i, status: i.status === "Open" ? "Closed" : "Open" }
        : i
    );

    saveInternships(updatedInternships);
  }

  function toggleArchive(id) {
  const today = new Date();

  const updatedInternships = internships.map((i) => {
    if (i.id !== id) return i;

    if (!i.deadline || new Date(i.deadline) > today) {
      alert("You can only archive after the deadline passes.");
      return i;
    }

    return { ...i, archived: !i.archived };
  });

  saveInternships(updatedInternships);
}

  function editInternship(id) {
    const internship = internships.find((i) => i.id === id);
    if (!internship) return;

    setEditingInternshipId(id);
    setEmployerFormErrors({});

    setForm({
      title: internship.title || "",
      location: internship.location || "",
      type: internship.type || "On-site",
      field: internship.field || "",
      description: internship.description || "",
      skills: internship.skills || "",
      duration: internship.duration || "",
      deadline: internship.deadline || "",
      languages: internship.languages || "",
      hiringStatus: internship.hiringStatus || "Currently hiring",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyToInternship(internship) {
    const letter = (coverLetters[internship.id] || "").trim();

    if (!letter) {
      setApplyFieldError({
        internshipId: internship.id,
        message: "Please write a short cover letter explaining why you fit the role.",
      });
      setApplySuccess(null);
      return;
    }

    if (letter.length > 200) {
      setApplyFieldError({
        internshipId: internship.id,
        message: "Cover letter must be 200 characters or less.",
      });
      setApplySuccess(null);
      return;
    }

    const alreadyApplied = applications.some(
      (a) =>
        a.studentEmail === user.email &&
        a.internshipId === internship.id
    );

    if (alreadyApplied) {
      setApplyFieldError({
        internshipId: internship.id,
        message: "You have already applied to this internship.",
      });
      setApplySuccess(null);
      return;
    }

    setApplyFieldError(null);

    const newApplication = createInternshipApplicationRecord({
      internship,
      user,
      letter,
    });

    const updatedApplications = [...applications, newApplication];
    saveApplications(updatedApplications);

    setCoverLetters((prev) => {
      const next = { ...prev };
      delete next[internship.id];
      return next;
    });

    setApplySuccess({
      internshipId: internship.id,
      message: "Application submitted successfully.",
    });

    if (internship.employerEmail) {
      appendNotification({
        text: `${user.firstName} ${user.lastName} applied to ${internship.title}.`,
        userEmail: internship.employerEmail,
        type: "internship-application",
        date: new Date().toLocaleString(),
      });
    }
  }

  function changeApplicationStatus(id, newStatus) {
    const application = applications.find((a) => a.id === id);

    const updatedApplications = applications.map((a) =>
      a.id === id ? { ...a, status: newStatus } : a
    );

    saveApplications(updatedApplications);

    if (application?.studentEmail) {
      appendNotification({
        text: "Your internship application status is now: " + newStatus,
        userEmail: application.studentEmail,
        type: "internship-status",
        date: new Date().toLocaleString(),
      });
    }
  }

  function markCompleted(id) {
    const application = applications.find((a) => a.id === id);

    const updatedApplications = applications.map((a) =>
      a.id === id ? { ...a, completed: true } : a
    );

    saveApplications(updatedApplications);

    if (application?.studentEmail) {
      appendNotification({
        text: `Your internship application status is now: Completed`,
        userEmail: application.studentEmail,
        type: "internship-status",
        date: new Date().toLocaleString(),
      });
    }
  }

  const companyOptions = [
  "All",
  ...new Set(internships.map((i) => i.company).filter(Boolean)),
];

const durationOptions = [
  "All",
  ...new Set(internships.map((i) => i.duration).filter(Boolean)),
];

let shownInternships = internships.filter((i) => {
    const matchesSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.company.toLowerCase().includes(search.toLowerCase()) ||
      (i.languages || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.skills || "").toLowerCase().includes(search.toLowerCase());

    const matchesField = fieldFilter === "All" || i.field === fieldFilter;
    const matchesStatus = statusFilter === "All" || i.status === statusFilter;

    const matchesCompany =
      companyFilter === "All" || i.company === companyFilter;

    const matchesDuration =
      durationFilter === "All" || i.duration === durationFilter;

    return (
      matchesSearch &&
      matchesField &&
      matchesStatus &&
      matchesCompany &&
      matchesDuration &&
      !i.archived
    );
  });

  shownInternships.sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "company") return a.company.localeCompare(b.company);
    if (sortBy === "status") return a.status.localeCompare(b.status);
    if (sortBy === "date-desc") {
      return new Date(b.postedAt || 0) - new Date(a.postedAt || 0);
    }
    if (sortBy === "date-asc") {
      return new Date(a.postedAt || 0) - new Date(b.postedAt || 0);
    }
    return 0;
  });

  return (
    <div className="pd-int-wrap">
      <header className="pd-int-hero">
        <h1 className="pd-int-title">Internships</h1>
        <p className="pd-int-lead">
          Browse opportunities, manage internship postings, review applications,
          and track professional internship activity.
        </p>
      </header>

      {user.role === "Student" && (
        <section className="pd-int-section pd-glass-panel">
          <h2 className="pd-int-section-title">Completed internships</h2>

          {applications.filter(
            (a) => a.studentEmail === user.email && a.completed
          ).length === 0 ? (
            <p className="pd-empty">No completed internships yet.</p>
          ) : (
            <div className="pd-stack">
              {applications
                .filter((a) => a.studentEmail === user.email && a.completed)
                .map((a) => (
                  <div key={a.id} className="pd-job-card">
                    <p style={{ margin: 0, color: "#e2e8f0", fontWeight: 600 }}>
                      {a.internshipTitle}
                    </p>

                    <p className="pd-muted" style={{ margin: "6px 0 0" }}>
                      {a.company}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {user.role === "Employer" && (
        <section className="pd-int-section pd-glass-panel">
          <h2 className="pd-int-section-title">Company internship analytics</h2>

          <p className="pd-muted" style={{ marginBottom: 18 }}>
            A professional overview of your company’s internship activity,
            including offered opportunities and completed student internships.
          </p>

          <section
            className="pd-stat-grid"
            aria-label="Company internship statistics"
          >
            <div className="pd-stat-card">
              <h3 className="pd-stat-num">{completedStudentCount}</h3>
              <p className="pd-stat-label">
                Students completed internships with my company
              </p>
            </div>

            <div className="pd-stat-card">
              <h3 className="pd-stat-num">{internshipsOfferedCount}</h3>
              <p className="pd-stat-label">
                Total internships offered by my company
              </p>
            </div>

            <div className="pd-stat-card">
              <h3 className="pd-stat-num">{openInternshipsCount}</h3>
              <p className="pd-stat-label">Currently open internships</p>
            </div>

            <div className="pd-stat-card">
              <h3 className="pd-stat-num">{closedInternshipsCount}</h3>
              <p className="pd-stat-label">Closed internship opportunities</p>
            </div>
          </section>

          <h2 className="pd-int-section-title" style={{ marginTop: 30 }}>
            {editingInternshipId
              ? "Edit internship opportunity"
              : "Create internship opportunity"}
          </h2>

          <div className="pd-stack">
            <input
              className={`pd-field${
                employerFormErrors.title ? " pd-field--error" : ""
              }`}
              placeholder="Internship title"
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                clearEmployerField("title");
              }}
            />

            {employerFormErrors.title && (
              <p className="pd-inline-error">{employerFormErrors.title}</p>
            )}

            <input
              className={`pd-field${
                employerFormErrors.location ? " pd-field--error" : ""
              }`}
              placeholder="Location"
              value={form.location}
              onChange={(e) => {
                setForm({ ...form, location: e.target.value });
                clearEmployerField("location");
              }}
            />

            {employerFormErrors.location && (
              <p className="pd-inline-error">{employerFormErrors.location}</p>
            )}

            <select
              className="pd-field"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option>On-site</option>
              <option>Remote</option>
              <option>Hybrid</option>
            </select>

            <select
              className="pd-field"
              value={form.hiringStatus}
              onChange={(e) =>
                setForm({ ...form, hiringStatus: e.target.value })
              }
            >
              <option>Currently hiring</option>
              <option>Position filled</option>
            </select>

            <input
              className={`pd-field${
                employerFormErrors.field ? " pd-field--error" : ""
              }`}
              placeholder="Field, for example Software"
              value={form.field}
              onChange={(e) => {
                setForm({ ...form, field: e.target.value });
                clearEmployerField("field");
              }}
            />

            {employerFormErrors.field && (
              <p className="pd-inline-error">{employerFormErrors.field}</p>
            )}

            <textarea
              className={`pd-field${
                employerFormErrors.description ? " pd-field--error" : ""
              }`}
              placeholder="Internship responsibilities and details"
              value={form.description}
              onChange={(e) => {
                setForm({ ...form, description: e.target.value });
                clearEmployerField("description");
              }}
            />

            {employerFormErrors.description && (
              <p className="pd-inline-error">
                {employerFormErrors.description}
              </p>
            )}

            <input
              className={`pd-field${
                employerFormErrors.skills ? " pd-field--error" : ""
              }`}
              placeholder="Required skills, for example Communication, Teamwork, Problem solving"
              value={form.skills}
              onChange={(e) => {
                setForm({ ...form, skills: e.target.value });
                clearEmployerField("skills");
              }}
            />

            {employerFormErrors.skills && (
              <p className="pd-inline-error">{employerFormErrors.skills}</p>
            )}

            <input
              className={`pd-field${
                employerFormErrors.duration ? " pd-field--error" : ""
              }`}
              placeholder="Duration, for example 3 months"
              value={form.duration}
              onChange={(e) => {
                setForm({ ...form, duration: e.target.value });
                clearEmployerField("duration");
              }}
            />

            {employerFormErrors.duration && (
              <p className="pd-inline-error">{employerFormErrors.duration}</p>
            )}

            <label className="pd-muted" htmlFor="internship-deadline">
              Application deadline
            </label>
            <input
              id="internship-deadline"
              type="date"
              className={`pd-field${
                employerFormErrors.deadline ? " pd-field--error" : ""
              }`}
              value={form.deadline}
              onChange={(e) => {
                setForm({ ...form, deadline: e.target.value });
                clearEmployerField("deadline");
              }}
            />

            {employerFormErrors.deadline && (
              <p className="pd-inline-error">{employerFormErrors.deadline}</p>
            )}

            <input
              className={`pd-field${
                employerFormErrors.languages ? " pd-field--error" : ""
              }`}
              placeholder="Programming languages to be used, for example JavaScript, Python, Java"
              value={form.languages}
              onChange={(e) => {
                setForm({ ...form, languages: e.target.value });
                clearEmployerField("languages");
              }}
            />

            {employerFormErrors.languages && (
              <p className="pd-inline-error">{employerFormErrors.languages}</p>
            )}

            <div className="pd-job-actions">
              <button
                type="button"
                className="pd-btn pd-btn--primary"
                onClick={addInternship}
              >
                {editingInternshipId ? "Update internship" : "Create internship"}
              </button>

              {editingInternshipId && (
                <button
                  type="button"
                  className="pd-btn pd-btn--ghost"
                  onClick={resetInternshipForm}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 28,
            }}
          >
            <h2 className="pd-int-section-title" style={{ marginTop: 0 }}>
              {showArchivedInternships
                ? "Archived internship postings"
                : "My active internship postings"}
            </h2>

            <button
              type="button"
              className="pd-btn pd-btn--ghost"
              onClick={() => setShowArchivedInternships(!showArchivedInternships)}
            >
              {showArchivedInternships
                ? "Show active internships"
                : "Show archived internships"}
            </button>
          </div>

          {visibleOwnInternships.length === 0 ? (
            <p className="pd-empty">
              {showArchivedInternships
                ? "No archived internships yet."
                : "You have not created any active internships yet."}
            </p>
          ) : (
            visibleOwnInternships.map((i) => (
              <div key={i.id} className="pd-job-card">
                <h3>{i.title}</h3>
                <p>Status: {i.status}</p>
                <p>Hiring status: {i.hiringStatus || "Currently hiring"}</p>
                <p>{i.archived ? "Archived" : "Active"}</p>
                <p>Location: {i.location}</p>
                <p>Type: {i.type}</p>
                <p>Field: {i.field}</p>
                <p>Responsibilities: {i.description}</p>
                <p>Required skills: {i.skills || "Not added"}</p>
                <p>Duration: {i.duration || "Not added"}</p>
                <p>Application deadline: {i.deadline || "Not added"}</p>
                <p>Programming languages: {i.languages || "Not added"}</p>

                <div className="pd-job-actions">
                  <button
                    type="button"
                    className="pd-btn pd-btn--ghost"
                    onClick={() => editInternship(i.id)}
                  >
                    Edit details
                  </button>

                  <button
                    type="button"
                    className="pd-btn pd-btn--danger"
                    onClick={() => deleteInternship(i.id)}
                  >
                    Delete
                  </button>

                  <button
                    type="button"
                    className="pd-btn pd-btn--primary"
                    onClick={() => toggleStatus(i.id)}
                  >
                    Toggle open / closed
                  </button>

                  <button
                    type="button"
                    className="pd-btn pd-btn--ghost"
                    onClick={() => toggleArchive(i.id)}
                  >
                    {i.archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </div>
            ))
          )}

          <h2 className="pd-int-section-title" style={{ marginTop: 28 }}>
            Suggested top applicants
          </h2>

          <p className="pd-muted" style={{ marginBottom: 14 }}>
            Suggested applicants are students who applied to your internships and whose project portfolios you saved to favorites.
          </p>

          {suggestedApplications.length === 0 ? (
            <p className="pd-empty">No suggested applicants yet.</p>
          ) : (
            suggestedApplications.map((a) => (
              <div key={a.id} className="pd-job-card">
                <h3>{a.studentName}</h3>
                <p>{a.studentEmail}</p>
                <p>Applied for: {a.internshipTitle}</p>
                <p>Contribution score: {a.contributionScore}</p>
                <p>Status: {a.status}</p>
                <p>
                  Recommendation reason: This student owns a project portfolio you saved to favorites.
                </p>
              </div>
            ))
          )}

          <h2 className="pd-int-section-title" style={{ marginTop: 28 }}>
            Internship applicants
          </h2>

          <div className="pd-toolbar">
            <label className="pd-muted" htmlFor="sort-applicants">
              Sort applicants by contribution
            </label>

            <select
              id="sort-applicants"
              className="pd-field"
              value={sortApplications}
              onChange={(e) => setSortApplications(e.target.value)}
            >
              <option value="top">Top contributors first</option>
              <option value="low">Lowest contributors first</option>
            </select>
          </div>

          {companyApplications.length === 0 ? (
            <p className="pd-empty">No applications received yet.</p>
          ) : (
            [...companyApplications]
              .sort((a, b) =>
                sortApplications === "top"
                  ? b.contributionScore - a.contributionScore
                  : a.contributionScore - b.contributionScore
              )
              .map((a) => (
                <div key={a.id} className="pd-job-card">
                  <h3>{a.studentName}</h3>
                  <p>{a.studentEmail}</p>
                  <p>Applied for: {a.internshipTitle}</p>
                  <p>Cover letter: {a.coverLetter}</p>
                  <p>Contribution score: {a.contributionScore}</p>
                  <p>Status: {a.status}</p>
                  <p>Completion: {a.completed ? "Completed" : "Not completed"}</p>

                  <div className="pd-job-actions">
                    <button
                      type="button"
                      className="pd-btn pd-btn--success"
                      onClick={() => changeApplicationStatus(a.id, "Accepted")}
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      className="pd-btn pd-btn--danger"
                      onClick={() => changeApplicationStatus(a.id, "Rejected")}
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      className="pd-btn pd-btn--ghost"
                      onClick={() => changeApplicationStatus(a.id, "Nominated")}
                    >
                      Nominate
                    </button>

                    <button
                      type="button"
                      className="pd-btn pd-btn--primary"
                      onClick={() => markCompleted(a.id)}
                    >
                      Mark completed
                    </button>
                  </div>
                </div>
              ))
          )}
        </section>
      )}

      <section className="pd-int-section pd-glass-panel">
        <h2 className="pd-int-section-title">Browse internships</h2>

        <div className="pd-toolbar">
          <input
            className="pd-field pd-field--grow"
            placeholder="Search by title, company, skills, or languages"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="pd-field"
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
          >
            <option>All</option>
            <option>Software</option>
            <option>Data</option>
            <option>Marketing</option>
          </select>

          <select
            className="pd-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>Open</option>
            <option>Closed</option>
          </select>

          <select
            className="pd-field"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            {companyOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <select
            className="pd-field"
            value={durationFilter}
            onChange={(e) => setDurationFilter(e.target.value)}
          >
            {durationOptions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>

          <select
            className="pd-field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="title">Sort by title</option>
            <option value="company">Sort by company</option>
            <option value="status">Sort by status</option>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
          </select>
        </div>

        <div className="pd-stack">
          {shownInternships.length === 0 ? (
            <p className="pd-empty">No internships match your search.</p>
          ) : (
            shownInternships.map((i) => (
              <div key={i.id} className="pd-job-card">
                <h3>{i.title}</h3>
                <p>Company: {i.company}</p>
                <p>Posted: {i.postedAt ? new Date(i.postedAt).toLocaleDateString() : "N/A"}</p>
                <p>Field: {i.field}</p>
                <p>Status: {i.status}</p>
                <p>Hiring status: {i.hiringStatus || "Currently hiring"}</p>
                <p>Duration: {i.duration || "Not added"}</p>
                <p>Application deadline: {i.deadline || "Not added"}</p>
                <p>Required skills: {i.skills || "Not added"}</p>
                <p>Programming languages: {i.languages || "Not added"}</p>

                <div className="pd-job-actions">
                  <button
                    type="button"
                    className="pd-btn pd-btn--primary"
                    onClick={() => setSelected(i)}
                  >
                    View details
                  </button>

                  <button
                    type="button"
                    className="pd-btn pd-btn--ghost"
                    onClick={() => setSelected(i)}
                  >
                    Select internship
                  </button>
                </div>

                {user.role === "Student" &&
                  i.status === "Open" &&
                  (i.hiringStatus || "Currently hiring") ===
                    "Currently hiring" && (
                  <div className="pd-stack" style={{ marginTop: 14 }}>
                    <textarea
                      className={`pd-field${
                        applyFieldError?.internshipId === i.id
                          ? " pd-field--error"
                          : ""
                      }`}
                      placeholder="Explain why you are a good fit for this internship (max 200 characters)"
                      maxLength={200}
                      value={coverLetters[i.id] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;

                        setCoverLetters((prev) => ({
                          ...prev,
                          [i.id]: value,
                        }));

                        if (applyFieldError?.internshipId === i.id) {
                          setApplyFieldError(null);
                        }

                        if (applySuccess?.internshipId === i.id) {
                          setApplySuccess(null);
                        }
                      }}
                    />

                    <p className="pd-muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
                      {(coverLetters[i.id] || "").length}/200 characters
                    </p>

                    {applyFieldError?.internshipId === i.id && (
                      <p className="pd-inline-error">
                        {applyFieldError.message}
                      </p>
                    )}

                    {applySuccess?.internshipId === i.id && (
                      <p className="pd-inline-success">
                        {applySuccess.message}
                      </p>
                    )}

                    <button
                      type="button"
                      className="pd-btn pd-btn--success"
                      onClick={() => applyToInternship(i)}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {selected && (
        <div className="pd-detail-drawer">
          <h2>Internship details</h2>
          <h3>{selected.title}</h3>
          <p>Company: {selected.company}</p>
          <p>Location: {selected.location}</p>
          <p>Type: {selected.type}</p>
          <p>Field: {selected.field}</p>
          <p>Status: {selected.status}</p>
          <p>Hiring status: {selected.hiringStatus || "Currently hiring"}</p>
          <p>Responsibilities: {selected.description}</p>
          <p>Required skills: {selected.skills || "Not added"}</p>
          <p>Duration: {selected.duration || "Not added"}</p>
          <p>Application deadline: {selected.deadline || "Not added"}</p>
          <p>Programming languages: {selected.languages || "Not added"}</p>

          <button
            type="button"
            className="pd-btn pd-btn--ghost"
            onClick={() => setSelected(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default InternshipSystem;
