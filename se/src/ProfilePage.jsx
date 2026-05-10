//import { useState, useRef } from "react";
import InternshipSystem from "./InternshipSystem";
import NotificationBell from "./NotificationBell";
import { useState, useRef, useMemo, useEffect } from "react";
import "./portal-dashboard.css";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const STORAGE_KEY = "userProfiles";

/** Same portrait for every student; file lives in `public/`. */
const DEFAULT_STUDENT_AVATAR_URL = "/default-student-pfp.png";

const LANGUAGE_CHART_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#14b8a6",
];

function loadProfiles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function newProjectTaskId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `task-${globalThis.crypto.randomUUID()}`;
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Average whole-project instructor rating (1–5), or null if none. */
function aggregateInstructorProjectRating(project) {
  const map = project?.instructorReviews || {};
  const values = Object.values(map)
    .map((r) =>
      r && r.projectRating != null && r.projectRating !== ""
        ? Number(r.projectRating)
        : NaN
    )
    .filter((x) => !Number.isNaN(x) && x >= 1 && x <= 5);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Milliseconds for sorting by creation (prefers creationTimestamp, else project id). */
function projectCreationSortKey(project) {
  if (typeof project?.creationTimestamp === "number") {
    return project.creationTimestamp;
  }
  const id = Number(project?.id);
  if (!Number.isNaN(id)) return id;
  const t = new Date(project?.creationDate).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function portfolioMatchesSearch(project, search) {
  const q = (search || "").trim().toLowerCase();
  if (!q) return true;
  const title = (project.title || "").toLowerCase();
  const ownerName = (project.ownerName || "").toLowerCase();
  const ownerEmail = (project.owner || "").toLowerCase();
  return (
    title.includes(q) ||
    ownerName.includes(q) ||
    ownerEmail.includes(q)
  );
}

function filterAndSortProjects(list, search, sortMode) {
  const out = list.filter((p) => portfolioMatchesSearch(p, search));
  out.sort((a, b) => {
    const ka = projectCreationSortKey(a);
    const kb = projectCreationSortKey(b);
    const ra = aggregateInstructorProjectRating(a);
    const rb = aggregateInstructorProjectRating(b);
    switch (sortMode) {
      case "creation-asc":
        return ka - kb;
      case "creation-desc":
        return kb - ka;
      case "rating-desc": {
        if (ra == null && rb == null) return kb - ka;
        if (ra == null) return 1;
        if (rb == null) return -1;
        if (Math.abs(rb - ra) > 1e-6) return rb - ra;
        return kb - ka;
      }
      case "rating-asc": {
        if (ra == null && rb == null) return ka - kb;
        if (ra == null) return 1;
        if (rb == null) return -1;
        if (Math.abs(ra - rb) > 1e-6) return ra - rb;
        return ka - kb;
      }
      default:
        return kb - ka;
    }
  });
  return out;
}

function AvatarUpload({ avatar, onAvatarChange, label = "Profile Picture", isEmployer = false }) {
  const inputRef = useRef();
  const [uploadError, setUploadError] = useState("");

  function handleFile(e) {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError(
        isEmployer
          ? "Only image files are allowed for company logo."
          : "Please upload an image file."
      );
      return;
    }

    if (isEmployer && file.size > 2 * 1024 * 1024) {
      setUploadError("Company logo must be less than 2MB.");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    reader.onload = (ev) => onAvatarChange(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div style={styles.avatarSection}>
      <div
        style={{
          ...styles.avatarWrapper,
          ...(uploadError
            ? { border: "3px solid rgba(220, 38, 38, 0.85)", boxShadow: "0 0 0 2px rgba(220,38,38,0.25)" }
            : {}),
        }}
        onClick={() => inputRef.current.click()}
      >
        {avatar ? (
          <img src={avatar} alt={label} style={styles.avatarImg} />
        ) : (
          <div style={styles.avatarPlaceholder}>
            <span style={{ fontSize: 36 }}>[ ]</span>
            <span style={{ fontSize: 12, marginTop: 4, color: "#94a3b8" }}>
              {label}
            </span>
          </div>
        )}

        <div style={styles.avatarOverlay}>Change</div>
      </div>

      {isEmployer && (
        <p className="ui-error-text" style={styles.logoWarning}>
          ⚠️ Upload official company logo only. Image max 2MB.
        </p>
      )}

      {uploadError ? (
        <p className="ui-error-text" role="alert">
          {uploadError}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}

function StaticStudentAvatar() {
  return (
    <div style={styles.avatarSection}>
      <div
        style={{
          ...styles.avatarWrapper,
          cursor: "default",
        }}
        aria-hidden
      >
        <img
          src={DEFAULT_STUDENT_AVATAR_URL}
          alt=""
          style={styles.avatarImg}
        />
      </div>
    </div>
  );
}

function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState("");

  function addTag() {
    const trimmed = input.trim();

    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }

    setInput("");
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div style={styles.tagContainer}>
      <div style={styles.tagList}>
        {tags.map((tag) => (
          <span key={tag} style={styles.tag}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={styles.tagRemove}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div style={styles.tagInputRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
          placeholder={placeholder}
          style={{ ...styles.input, marginBottom: 0, flex: 1 }}
        />

        <button type="button" onClick={addTag} style={styles.addTagBtn}>
          + Add
        </button>
      </div>
    </div>
  );
}

function MapPicker({ location, setLocation }) {
  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lat = 30.0 + (y / rect.height) * 0.1;
    const lng = 31.0 + (x / rect.width) * 0.1;

    setLocation({ lat, lng });
  }

  return (
    <div>
      <p style={styles.mapHint}>
        Click inside the location box to place your company marker.
      </p>

      <div style={styles.mapPickerBox} onClick={handleClick}>
        {location && <div style={styles.mapMarker}></div>}
      </div>

      {location && (
        <p style={styles.mapCoords}>
          Lat: {location.lat.toFixed(4)} | Lng: {location.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}

function StudentProfile({ user, profile, onSave, onGoToCreateProject }) {
  const [editing, setEditing] = useState(false);
  const [major, setMajor] = useState(profile.major || "");
  const [skills, setSkills] = useState(profile.skills || []);
  const [linkedin, setLinkedin] = useState(profile.linkedin || "");

  function handleSave() {
    onSave({
      major,
      skills,
      linkedin,
      avatar: DEFAULT_STUDENT_AVATAR_URL,
    });
    setEditing(false);
  }

  function handleCancel() {
    setMajor(profile.major || "");
    setSkills(profile.skills || []);
    setLinkedin(profile.linkedin || "");
    setEditing(false);
  }

  function removeBasicInfo() {
    const confirmRemove = window.confirm(
      "Are you sure you want to remove your major, skills, and LinkedIn/CV link?"
    );

    if (!confirmRemove) return;

    setMajor("");
    setSkills([]);
    setLinkedin("");

    onSave({
      major: "",
      skills: [],
      linkedin: "",
      avatar: DEFAULT_STUDENT_AVATAR_URL,
    });

    setEditing(false);
  }

  return (
    <div style={styles.profileCard}>
      <div style={styles.cardHeader}>
        <StaticStudentAvatar />

        <div style={styles.headerInfo}>
          <h2 style={styles.userName}>
            {user.firstName} {user.lastName}
          </h2>

          <span style={styles.roleBadge}>🎓 Student</span>

          <p style={styles.emailText}>{user.email}</p>
        </div>

        {!editing && (
          <button style={styles.editBtn} onClick={() => setEditing(true)}>
            ✏️ Add / Update Basic Info
          </button>
        )}
      </div>

      {editing ? (
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>Edit My Basic Information</h3>

          <label style={styles.label}>Major</label>
          <input
            style={styles.input}
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="Example: Computer Science"
          />

          <label style={styles.label}>Skills</label>
          <TagInput
            tags={skills}
            onChange={setSkills}
            placeholder="Type a skill and press Enter"
          />

          <label style={styles.label}>LinkedIn Link / CV Link</label>
          <input
            style={styles.input}
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/yourprofile"
          />

          <div style={styles.btnRow}>
            <button style={styles.saveBtn} onClick={handleSave}>
              Save
            </button>

            <button style={styles.cancelBtn} onClick={handleCancel}>
              Cancel
            </button>

            <button style={styles.deleteBtn} onClick={removeBasicInfo}>
              Remove Basic Info
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.viewSection}>
          <h3 style={styles.sectionTitle}>My Basic Information</h3>

          <InfoRow label="Major" value={major || "Not added yet"} />

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Skills</span>

            <div style={styles.tagList}>
              {skills.length > 0 ? (
                skills.map((skill) => (
                  <span key={skill} style={styles.tag}>
                    {skill}
                  </span>
                ))
              ) : (
                <span style={styles.infoValue}>No skills added yet</span>
              )}
            </div>
          </div>

          <InfoRow
            label="LinkedIn / CV"
            value={
              linkedin ? (
                <a
                  href={linkedin}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.link}
                >
                  {linkedin}
                </a>
              ) : (
                "No LinkedIn/CV link added yet"
              )
            }
          />
        </div>
      )}

      {onGoToCreateProject ? (
        <div
          style={{
            marginTop: 20,
            paddingTop: 18,
            borderTop: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <button
            type="button"
            className="pp-btn-press"
            style={{
              ...styles.saveBtn,
              width: "100%",
              maxWidth: 480,
              padding: "14px 22px",
              fontSize: 16,
            }}
            onClick={onGoToCreateProject}
          >
            Create a new project
          </button>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 12,
              color: "#94a3b8",
              lineHeight: 1.45,
            }}
          >
            Opens the project builder on the Project Portfolios tab.
          </p>
        </div>
      ) : null}
    </div>
  );
}

const AVAILABLE_COURSES = [
  "CSEN 401 - Computer Programming Lab",
  "CSEN 501 - Database I",
  "CSEN 601 - Software Engineering",
  "CSEN 701 - Embedded Systems",
  "CSEN 801 - Bachelor Project",
  "DMET 501 - Introduction to Multimedia",
  "DMET 601 - Animation",
];

function InstructorProfile({ user, profile, onSave }) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile.bio || "");
  const [research, setResearch] = useState(profile.research || "");
  const [education, setEducation] = useState(profile.education || "");
  const [avatar, setAvatar] = useState(profile.avatar || "");
  const [linkedCourses, setLinkedCourses] = useState(
    profile.linkedCourses || ["CSEN 801 - Bachelor Project"]
  );
  const [showCourseModal, setShowCourseModal] = useState(false);

  function handleSave() {
    onSave({ bio, research, education, avatar, linkedCourses });
    setEditing(false);
  }

  function handleCancel() {
    setBio(profile.bio || "");
    setResearch(profile.research || "");
    setEducation(profile.education || "");
    setAvatar(profile.avatar || "");
    setLinkedCourses(profile.linkedCourses || ["CSEN 801 - Bachelor Project"]);
    setEditing(false);
  }

  function toggleCourse(course) {
    if (course === "CSEN 801 - Bachelor Project") return;

    setLinkedCourses((prev) =>
      prev.includes(course)
        ? prev.filter((c) => c !== course)
        : [...prev, course]
    );
  }

  return (
    <div style={styles.profileCard}>
      <div style={styles.cardHeader}>
        <AvatarUpload
          avatar={avatar}
          onAvatarChange={setAvatar}
          label="Upload Profile"
        />

        <div style={styles.headerInfo}>
          <h2 style={styles.userName}>
            {user.firstName} {user.lastName}
          </h2>

          <span style={styles.roleBadge}>👨‍🏫 Course Instructor</span>

          <p style={styles.emailText}>{user.email}</p>
        </div>

        {!editing && (
          <button style={styles.editBtn} onClick={() => setEditing(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {editing ? (
        <div style={styles.formSection}>
          <label style={styles.label}>Short Biography</label>
          <textarea
            style={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell students about yourself..."
            rows={3}
          />

          <label style={styles.label}>Research Interests</label>
          <input
            style={styles.input}
            value={research}
            onChange={(e) => setResearch(e.target.value)}
            placeholder="Example: Machine Learning"
          />

          <label style={styles.label}>Education Background</label>
          <textarea
            style={styles.textarea}
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="Example: PhD Computer Science"
            rows={2}
          />

          <label style={styles.label}>Linked Courses</label>
          <div style={styles.tagList}>
            {linkedCourses.map((course) => (
              <span key={course} style={styles.tag}>
                {course}

                {course !== "CSEN 801 - Bachelor Project" && (
                  <button
                    type="button"
                    onClick={() => toggleCourse(course)}
                    style={styles.tagRemove}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          <button
            type="button"
            style={styles.addTagBtn}
            onClick={() => setShowCourseModal(true)}
          >
            + Link a Course
          </button>

          {showCourseModal && (
            <div style={styles.modal}>
              <div style={styles.modalBox}>
                <h3 style={{ marginTop: 0, color: "#f8fafc" }}>
                  Select Courses to Link
                </h3>

                {AVAILABLE_COURSES.map((course) => (
                  <label key={course} style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={linkedCourses.includes(course)}
                      disabled={course === "CSEN 801 - Bachelor Project"}
                      onChange={() => toggleCourse(course)}
                    />

                    <span style={{ marginLeft: 8, color: "#e2e8f0" }}>{course}</span>
                  </label>
                ))}

                <button
                  style={styles.saveBtn}
                  onClick={() => setShowCourseModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          <div style={styles.btnRow}>
            <button style={styles.saveBtn} onClick={handleSave}>
              Save
            </button>

            <button style={styles.cancelBtn} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.viewSection}>
          <InfoRow label="Biography" value={bio || "—"} />
          <InfoRow label="Research Interests" value={research || "—"} />
          <InfoRow label="Education" value={education || "—"} />

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Linked Courses</span>

            <div style={styles.tagList}>
              {linkedCourses.map((course) => (
                <span key={course} style={styles.tag}>
                  {course}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyProfile({ user, profile, onSave }) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile.bio || "");
  const [address, setAddress] = useState(profile.address || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [logo, setLogo] = useState(profile.logo || "");
  const [docs, setDocs] = useState(profile.docs || []);
  const [location, setLocation] = useState(profile.location || null);
  const [docUploadError, setDocUploadError] = useState("");
  const docRef = useRef();

  function handleSave() {
    onSave({
      bio,
      address,
      phone,
      website,
      logo,
      docs,
      location,
    });

    setEditing(false);
  }

  function handleCancel() {
    setBio(profile.bio || "");
    setAddress(profile.address || "");
    setPhone(profile.phone || "");
    setWebsite(profile.website || "");
    setLogo(profile.logo || "");
    setDocs(profile.docs || []);
    setLocation(profile.location || null);
    setDocUploadError("");
    setEditing(false);
  }

  function handleDocUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setDocUploadError("Only PDF files are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDocUploadError("File must be under 5MB.");
      return;
    }

    setDocUploadError("");
    const reader = new FileReader();

    reader.onload = (ev) => {
      setDocs((prev) => [
        ...prev,
        {
          name: file.name,
          data: ev.target.result,
          uploadedAt: new Date().toLocaleDateString(),
        },
      ]);
    };

    reader.readAsDataURL(file);
  }

  function removeDoc(name) {
    setDocs((prev) => prev.filter((doc) => doc.name !== name));
  }

  return (
    <div style={styles.profileCard}>
      <div style={styles.cardHeader}>
        <AvatarUpload
          avatar={logo}
          onAvatarChange={setLogo}
          label="Company Logo"
          isEmployer={true}
        />

        <div style={styles.headerInfo}>
          <h2 style={styles.userName}>{user.companyName}</h2>
          <span style={styles.roleBadge}>🏢 Employer</span>
          <p style={styles.emailText}>{user.email}</p>
        </div>

        {!editing && (
          <button style={styles.editBtn} onClick={() => setEditing(true)}>
            ✏️ Edit Company Profile
          </button>
        )}
      </div>

      {editing ? (
        <div style={styles.formSection}>
          <label style={styles.label}>Company Biography</label>
          <textarea
            style={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell students about your company..."
            rows={3}
          />

          <label style={styles.label}>Address</label>
          <input
            style={styles.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Business St, Cairo, Egypt"
          />

          <label style={styles.label}>Company Location on Google Maps</label>
          <MapPicker location={location} setLocation={setLocation} />

          <label style={styles.label}>Phone</label>
          <input
            style={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+20 2 1234 5678"
          />

          <label style={styles.label}>Website</label>
          <input
            style={styles.input}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourcompany.com"
          />

          <label style={styles.label}>📄 Upload Documents</label>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
            PDF only · Max 5MB per file
          </p>

          <div style={styles.docList}>
            {docs.map((doc) => (
              <div key={doc.name} style={styles.docRow}>
                <span>📄 {doc.name}</span>

                <span style={{ color: "#94a3b8", fontSize: 12 }}>
                  {doc.uploadedAt}
                </span>

                <button
                  type="button"
                  onClick={() => removeDoc(doc.name)}
                  style={styles.tagRemove}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            style={styles.addTagBtn}
            onClick={() => docRef.current.click()}
          >
            + Upload PDF
          </button>

          <input
            ref={docRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={handleDocUpload}
          />

          {docUploadError ? (
            <p className="ui-error-text" role="alert">
              {docUploadError}
            </p>
          ) : null}

          <div style={styles.btnRow}>
            <button style={styles.saveBtn} onClick={handleSave}>
              Save
            </button>

            <button style={styles.cancelBtn} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.viewSection}>
          <InfoRow label="About" value={bio || "—"} />
          <InfoRow label="Address" value={address || "—"} />
          <InfoRow label="Phone" value={phone || "—"} />

          <InfoRow
            label="Website"
            value={
              website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.link}
                >
                  {website}
                </a>
              ) : (
                "—"
              )
            }
          />

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Location</span>

            <span style={styles.infoValue}>
              {location
                ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`
                : "No location selected"}
            </span>
          </div>

          {location && (
            <iframe
              title="Company location"
              width="100%"
              height="250"
              style={styles.mapFrame}
              src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
            />
          )}

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Documents</span>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {docs.length > 0 ? (
                docs.map((doc) => (
                  <a
                    key={doc.name}
                    href={doc.data}
                    download={doc.name}
                    style={styles.link}
                  >
                    📄 {doc.name}
                  </a>
                ))
              ) : (
                <span style={styles.infoValue}>No documents uploaded</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectPortfolios({ user }) {
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem("projects");
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showRecommendedPage, setShowRecommendedPage] = useState(false);
const FAVORITES_KEY = "favoriteProjects";

const [favorites, setFavorites] = useState(() => {
  const saved = localStorage.getItem(FAVORITES_KEY);
  return saved ? JSON.parse(saved) : {};
});

  const [editingId, setEditingId] = useState(null);
  const [projectFieldErrors, setProjectFieldErrors] = useState({});
  const [thesisUploadError, setThesisUploadError] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState(null);
  const [taskDraftByProjectId, setTaskDraftByProjectId] = useState({});
  /** Draft overrides while typing: { [projectId]: { projectComment?, tasks?: { [taskId]: string } } } */
  const [instructorDrafts, setInstructorDrafts] = useState({});
  /** Short status after whole-project actions (save rating/comment, etc.) */
  const [instructorWholeProjectHint, setInstructorWholeProjectHint] =
    useState({});
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [projectSortMode, setProjectSortMode] = useState("creation-desc");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  /** Student: create/edit form is a separate step from the project list. */
  const [studentProjectFormOpen, setStudentProjectFormOpen] = useState(() => {
    try {
      if (sessionStorage.getItem("guc-open-project-create") === "1") {
        sessionStorage.removeItem("guc-open-project-create");
        return user.role === "Student";
      }
    } catch {
      /* ignore */
    }
    return false;
  });

  const [form, setForm] = useState({
    title: "",
    course: "CSEN 401 - Computer Programming Lab",
    github: "",
    report: "",
    languages: "",
    demo: "",
    visibility: "Private",
    theses: [],
  });

  const courses = [
    "CSEN 401 - Computer Programming Lab",
    "CSEN 501 - Database I",
    "CSEN 601 - Software Engineering",
    "CSEN 701 - Embedded Systems",
    "CSEN 801 - Bachelor Project",
    "DMET 501 - Introduction to Multimedia",
    "DMET 601 - Animation",
  ];

  const pendingInvitations = projects.filter((p) =>
    (p.invitations || []).some(
      (inv) => inv.email === user.email && inv.status === "No Reply"
    )
  );

  function getCourseInstructors(courseName) {
    const users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    const profiles = JSON.parse(localStorage.getItem("userProfiles")) || {};

    let matched = users.filter((u) => {
      if (u.role !== "Course Instructor") return false;

      const instructorProfile = profiles[u.email] || {};

    const linkedCourses =
  instructorProfile.linkedCourses ||
  instructorProfile.courses ||
  instructorProfile.linked_courses ||
  ["CSEN 801 - Bachelor Project"];

      return linkedCourses.some(
        (course) =>
          course.trim().toLowerCase() === courseName.trim().toLowerCase()
      );
    });

    if (matched.length === 0) {
      return users.filter((u) => u.role === "Course Instructor");
    }

    return matched;
  }

  function saveProjects(updatedProjects) {
    setProjects(updatedProjects);
    localStorage.setItem("projects", JSON.stringify(updatedProjects));
  }
  function canUseFavorites() {
  return user.role === "Student" || user.role === "Employer";
}

function getMyFavoriteIds() {
  return favorites[user.email] || [];
}
function getRecommendedProjects() {
  return visibleProjects
    .filter((p) => p.visibility === "Public")
    .sort((a, b) => {
      const ratingA = aggregateInstructorProjectRating(a) || 0;
      const ratingB = aggregateInstructorProjectRating(b) || 0;

      if (ratingB !== ratingA) return ratingB - ratingA;

      return projectCreationSortKey(b) - projectCreationSortKey(a);
    })
    .slice(0, 3);
}

function isFavorite(projectId) {
  return getMyFavoriteIds().includes(projectId);
}

function toggleFavorite(projectId) {
  const currentFavorites = getMyFavoriteIds();

  let updatedUserFavorites;

  if (currentFavorites.includes(projectId)) {
    updatedUserFavorites = currentFavorites.filter((id) => id !== projectId);
  } else {
    updatedUserFavorites = [...currentFavorites, projectId];
  }

  const updatedFavorites = {
    ...favorites,
    [user.email]: updatedUserFavorites,
  };

  setFavorites(updatedFavorites);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
}

  function clearForm() {
    setForm({
      title: "",
      course: "CSEN 401 - Computer Programming Lab",
      github: "",
      report: "",
      languages: "",
      demo: "",
      visibility: "Private",
      theses: [],
    });

    setEditingId(null);
    setProjectFieldErrors({});
    setThesisUploadError("");
  }

  function handleThesisUpload(e) {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    const invalidFile = files.find((file) => file.type !== "application/pdf");

    if (invalidFile) {
      setThesisUploadError("Only PDF files are allowed for thesis drafts.");
      return;
    }

    const tooLargeFile = files.find((file) => file.size > 5 * 1024 * 1024);

    if (tooLargeFile) {
      setThesisUploadError("Each thesis draft must be less than 5MB.");
      return;
    }

    setThesisUploadError("");
    const readers = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (ev) => {
          resolve({
            name: file.name,
            data: ev.target.result,
            uploadedAt: new Date().toLocaleDateString(),
            isFinal: false,
          });
        };

        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((newDrafts) => {
      setForm({
        ...form,
        theses: [...form.theses, ...newDrafts],
      });
      setProjectFieldErrors((prev) => {
        if (!prev.theses) return prev;
        const next = { ...prev };
        delete next.theses;
        return next;
      });
    });
  }

  function addOrUpdateProject() {
    const errors = {};

    if (!form.title.trim()) errors.title = "Project title is required.";
    if (!form.course) errors.course = "Course is required.";
    if (!form.github.trim()) errors.github = "GitHub link is required.";
    if (!form.report.trim()) errors.report = "Project report is required.";
    if (!form.languages.trim())
      errors.languages = "Programming languages are required.";
    if (!form.demo.trim()) errors.demo = "Demo video link is required.";

    if (
      form.course === "CSEN 801 - Bachelor Project" &&
      form.theses.length === 0
    ) {
      errors.theses =
        "At least one thesis draft is required for Bachelor Project.";
    }

    if (Object.keys(errors).length > 0) {
      setProjectFieldErrors(errors);
      return;
    }

    setProjectFieldErrors({});

    if (editingId) {
      const updatedProjects = projects.map((p) =>
        p.id === editingId
          ? { ...p, ...form, tasks: p.tasks || [] }
          : p
      );

      saveProjects(updatedProjects);
      clearForm();
      setStudentProjectFormOpen(false);
      return;
    }

    const now = Date.now();
    const newProject = {
      id: now,
      ...form,
      owner: user.email,
      ownerName: `${user.firstName} ${user.lastName}`,
      creationDate: new Date().toLocaleDateString(),
      creationTimestamp: now,
      invitations: [],
      tasks: [],
    };

    saveProjects([...projects, newProject]);
    clearForm();
    setStudentProjectFormOpen(false);
  }

  function editProject(project) {
    setStudentProjectFormOpen(true);
    setEditingId(project.id);
    setProjectFieldErrors({});
    setThesisUploadError("");
    setInviteFeedback(null);

    setForm({
      title: project.title,
      course: project.course,
      github: project.github,
      report: project.report,
      languages: project.languages,
      demo: project.demo,
      visibility: project.visibility,
      theses: project.theses || [],
    });
  }

  function deleteProject(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmDelete) return;

    const updatedProjects = projects.filter((p) => p.id !== id);
    saveProjects(updatedProjects);
  }

  function toggleProjectVisibility(id) {
    const updatedProjects = projects.map((p) =>
      p.id === id
        ? {
            ...p,
            visibility: p.visibility === "Public" ? "Private" : "Public",
          }
        : p
    );

    saveProjects(updatedProjects);
  }

  function setFinalDraft(projectId, draftIndex) {
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        const updatedTheses = (p.theses || []).map((draft, index) => ({
          ...draft,
          isFinal: index === draftIndex,
        }));

        return {
          ...p,
          theses: updatedTheses,
        };
      }

      return p;
    });

    saveProjects(updatedProjects);
  }

  function inviteInstructor(projectId, instructor) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    if (project.owner !== user.email) {
      setInviteFeedback({
        projectId,
        variant: "error",
        message: "Only the project creator can invite or manage instructors.",
      });
      return;
    }

    const currentInvitations = project.invitations || [];

    if (
      currentInvitations.some((inv) => inv.email === instructor.email)
    ) {
      setInviteFeedback({
        projectId,
        variant: "error",
        message: "This instructor was already invited.",
      });
      return;
    }

    const newInvitation = {
      email: instructor.email,
      name: `${instructor.firstName} ${instructor.lastName}`,
      status: "No Reply",
    };

    setInviteFeedback({
      projectId,
      variant: "success",
      message: `Invitation sent to ${instructor.firstName} ${instructor.lastName}.`,
    });

    const updatedProjects = projects.map((p) =>
      p.id === projectId
        ? { ...p, invitations: [...currentInvitations, newInvitation] }
        : p
    );

    saveProjects(updatedProjects);
  }

  function removeProjectCollaborator(projectId, collaboratorEmail) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    if (project.owner !== user.email) {
      setInviteFeedback({
        projectId,
        variant: "error",
        message: "Only the project creator can remove collaborators.",
      });
      return;
    }

    const target = collaboratorEmail.trim().toLowerCase();
    const currentInvitations = project.invitations || [];
    if (!currentInvitations.some((inv) => inv.email.toLowerCase() === target)) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this instructor from the project? Their invitation will be deleted."
    );
    if (!confirmed) return;

    const updatedInvitations = currentInvitations.filter(
      (inv) => inv.email.toLowerCase() !== target
    );

    setInviteFeedback({
      projectId,
      variant: "success",
      message: "Collaborator removed from this project.",
    });

    saveProjects(
      projects.map((p) =>
        p.id === projectId ? { ...p, invitations: updatedInvitations } : p
      )
    );
  }

  function respondToInvitation(projectId, response) {
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        const updatedInvitations = (p.invitations || []).map((inv) =>
          inv.email === user.email ? { ...inv, status: response } : inv
        );

        return {
          ...p,
          invitations: updatedInvitations,
        };
      }

      return p;
    });

    saveProjects(updatedProjects);
  }

  let visibleProjects;

if (user.role === "Student") {
  visibleProjects = projects.filter(
    (p) => p.owner === user.email || p.visibility === "Public"
  );
} else if (user.role === "Course Instructor") {
  visibleProjects = projects.filter((p) => {
    if (p.visibility === "Public") return true;
    return (p.invitations || []).some(
      (inv) =>
        inv.email === user.email && inv.status === "Accepted"
    );
  });
} else {
  visibleProjects = projects.filter((p) => p.visibility === "Public");
}

  const myInstructorInvitations = projects.filter((p) =>
    (p.invitations || []).some((inv) => inv.email === user.email)
  );

  const displayedProjects = useMemo(() => {
  let list = filterAndSortProjects(
    visibleProjects,
    projectSearchQuery,
    projectSortMode
  );

  if (showFavoritesOnly) {
    list = list.filter((p) => getMyFavoriteIds().includes(p.id));
  }

  return list;
}, [visibleProjects, projectSearchQuery, projectSortMode, favorites, showFavoritesOnly]);

  function clearProjectError(key) {
    setProjectFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function isStudentProjectCreator(project) {
    return (
      user.role === "Student" &&
      project &&
      project.owner === user.email
    );
  }

  function taskImportanceLabel(index, total) {
    if (total <= 1) return "Single priority";
    if (index === 0) return "Highest importance";
    if (index === total - 1) return "Lowest importance";
    return `Rank ${index + 1} of ${total}`;
  }

  function addProjectTask(projectId, title) {
    const project = projects.find((pr) => pr.id === projectId);
    if (!isStudentProjectCreator(project)) return;

    const trimmed = title.trim();
    if (!trimmed) return;

    const tasks = [...(project.tasks || [])];
    tasks.push({
      id: newProjectTaskId(),
      title: trimmed,
    });

    saveProjects(
      projects.map((pr) => (pr.id === projectId ? { ...pr, tasks } : pr))
    );
    setTaskDraftByProjectId((prev) => ({ ...prev, [projectId]: "" }));
  }

  function moveProjectTask(projectId, taskId, delta) {
    const project = projects.find((pr) => pr.id === projectId);
    if (!isStudentProjectCreator(project)) return;

    const tasks = [...(project.tasks || [])];
    const index = tasks.findIndex((t) => t.id === taskId);
    const swap = index + delta;
    if (index < 0 || swap < 0 || swap >= tasks.length) return;

    const nextTasks = [...tasks];
    const tmp = nextTasks[index];
    nextTasks[index] = nextTasks[swap];
    nextTasks[swap] = tmp;

    saveProjects(
      projects.map((pr) =>
        pr.id === projectId ? { ...pr, tasks: nextTasks } : pr
      )
    );
  }

  function removeProjectTask(projectId, taskId) {
    const project = projects.find((pr) => pr.id === projectId);
    if (!isStudentProjectCreator(project)) return;

    const tasks = (project.tasks || []).filter((t) => t.id !== taskId);
    saveProjects(
      projects.map((pr) => (pr.id === projectId ? { ...pr, tasks } : pr))
    );
  }

  function isAcceptedCourseInstructorProject(project) {
    if (user.role !== "Course Instructor" || !project) return false;
    return (project.invitations || []).some(
      (inv) => inv.email === user.email && inv.status === "Accepted"
    );
  }

  function getMyInstructorReview(project) {
    const map = project.instructorReviews || {};
    const mine = map[user.email];
    return (
      mine || {
        projectComment: "",
        projectRating: null,
        taskComments: {},
      }
    );
  }

  function instructorDisplayName(email) {
    try {
      const users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
      const u = users.find((x) => x.email === email);
      if (u) return `${u.firstName} ${u.lastName}`;
    } catch {
      /* ignore */
    }
    return email;
  }

  function applyInstructorReviewUpdate(projectId, recipe) {
    const p = projects.find((pr) => pr.id === projectId);
    if (!p || !isAcceptedCourseInstructorProject(p)) return;
    const email = user.email;
    const base = { ...(p.instructorReviews || {}) };
    const mine = {
      projectComment: "",
      projectRating: null,
      taskComments: {},
      ...(base[email] || {}),
    };
    const nextMine = recipe(JSON.parse(JSON.stringify(mine)));
    const projectComment = String(nextMine.projectComment ?? "").trim();
    const projectRatingRaw = nextMine.projectRating;
    const projectRating =
      projectRatingRaw != null &&
      projectRatingRaw !== "" &&
      !Number.isNaN(Number(projectRatingRaw))
        ? Math.min(5, Math.max(1, Math.round(Number(projectRatingRaw))))
        : null;
    const taskComments = {};
    Object.entries(nextMine.taskComments || {}).forEach(([tid, txt]) => {
      const t = String(txt ?? "").trim();
      if (t) taskComments[tid] = t;
    });
    const cleaned = { projectComment, projectRating, taskComments };
    const nextMap = { ...base };
    const empty =
      !cleaned.projectComment &&
      cleaned.projectRating == null &&
      Object.keys(cleaned.taskComments).length === 0;
    if (empty) delete nextMap[email];
    else nextMap[email] = cleaned;

    saveProjects(
      projects.map((pr) =>
        pr.id === projectId ? { ...pr, instructorReviews: nextMap } : pr
      )
    );
  }

  function getProjectCommentDraft(p) {
    const r = getMyInstructorReview(p);
    const o = instructorDrafts[p.id];
    if (o && typeof o.projectComment === "string") return o.projectComment;
    return r.projectComment;
  }

  function getTaskCommentDraft(p, taskId) {
    const r = getMyInstructorReview(p);
    const o = instructorDrafts[p.id]?.tasks?.[taskId];
    if (typeof o === "string") return o;
    return r.taskComments[taskId] || "";
  }

  function clearProjectCommentDraft(p) {
    setInstructorDrafts((prev) => {
      const n = { ...prev };
      const sub = { ...(n[p.id] || {}) };
      delete sub.projectComment;
      if (!sub.tasks || Object.keys(sub.tasks).length === 0) delete n[p.id];
      else n[p.id] = sub;
      return n;
    });
  }

  function clearTaskCommentDraft(p, taskId) {
    setInstructorDrafts((prev) => {
      const n = { ...prev };
      const sub = { ...(n[p.id] || {}) };
      const tasks = { ...(sub.tasks || {}) };
      delete tasks[taskId];
      if (Object.keys(tasks).length === 0) delete sub.tasks;
      else sub.tasks = tasks;
      if (!sub.projectComment && !sub.tasks) delete n[p.id];
      else n[p.id] = sub;
      return n;
    });
  }

  function instructorReviewHasContent(rev) {
    if (!rev || typeof rev !== "object") return false;
    if (String(rev.projectComment || "").trim()) return true;
    if (
      rev.projectRating != null &&
      rev.projectRating !== "" &&
      !Number.isNaN(Number(rev.projectRating))
    ) {
      return true;
    }
    const tc = rev.taskComments || {};
    return Object.keys(tc).some((tid) => String(tc[tid] || "").trim());
  }

  function projectHasInstructorFeedback(project) {
    const map = project.instructorReviews || {};
    return Object.values(map).some((r) => instructorReviewHasContent(r));
  }

  function flashWholeProjectHint(projectId, text) {
    setInstructorWholeProjectHint((prev) => ({ ...prev, [projectId]: text }));
    window.setTimeout(() => {
      setInstructorWholeProjectHint((prev) => {
        const next = { ...prev };
        if (next[projectId] === text) delete next[projectId];
        return next;
      });
    }, 4500);
  }


  const myProjects = projects.filter((project) => project.owner === user.email);

  const languageCounts = {};

  myProjects.forEach((project) => {
    const languages = (project.languages || "")
      .split(",")
      .map((language) => language.trim())
      .filter((language) => language.length > 0);

    languages.forEach((language) => {
      languageCounts[language] = (languageCounts[language] || 0) + 1;
    });
  });

  const totalLanguageUses = Object.values(languageCounts).reduce(
    (total, count) => total + count,
    0
  );

  const languageStatistics = Object.entries(languageCounts).map(
    ([language, count]) => ({
      language,
      count,
      percentage:
        totalLanguageUses === 0
          ? 0
          : Math.round((count / totalLanguageUses) * 100),
    })
  );

  const languageChartData = languageStatistics.map((item) => ({
    name: item.language,
    value: item.percentage,
    count: item.count,
  }));

  const collaboratorStatistics = myProjects.map((project) => {
    const acceptedCollaborators = (project.invitations || []).filter(
      (invitation) => invitation.status === "Accepted"
    );

    return {
      projectId: project.id,
      projectTitle: project.title,
      collaborators: acceptedCollaborators,
    };
  });

  /** Read-only summary: hide if only the current instructor has feedback (they already use the editor). */
  function showAggregatedInstructorFeedback(project) {
    if (!projectHasInstructorFeedback(project)) return false;
    if (!isAcceptedCourseInstructorProject(project)) return true;
    const entries = Object.entries(project.instructorReviews || {}).filter(
      ([, rev]) => instructorReviewHasContent(rev)
    );
    if (entries.length === 0) return false;
    if (entries.length === 1 && entries[0][0] === user.email) return false;
    return true;
  }
if (showRecommendedPage) {
  return (
    <div style={styles.profileCard}>
      <button
        type="button"
        className="pp-btn-press"
        style={styles.cancelBtn}
        onClick={() => setShowRecommendedPage(false)}
      >
        ← Back
      </button>

      <h2 style={styles.sectionTitle}>Recommended Projects</h2>

      {getRecommendedProjects().length === 0 ? (
        <p style={styles.infoValue}>No recommended projects available.</p>
      ) : (
        getRecommendedProjects().map((p) => (
          <div key={p.id} style={styles.projectCard}>
            <h3>{p.title}</h3>
            <p>Course: {p.course}</p>
            <p>Student: {p.ownerName || p.owner}</p>
            <p>
              Rating:{" "}
              {aggregateInstructorProjectRating(p)
                ? aggregateInstructorProjectRating(p).toFixed(1) + " / 5"
                : "Not rated yet"}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
  return (
    <div style={styles.profileCard}>
      <h2 style={styles.sectionTitle}>Project Portfolios</h2>

      {user.role === "Student" && !studentProjectFormOpen && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
  <button
    type="button"
    className="pp-btn-press"
    style={{
      ...styles.saveBtn,
      flex: 1,
      padding: "14px 22px",
      fontSize: 16,
    }}
    onClick={() => setStudentProjectFormOpen(true)}
  >
    Create a new project
  </button>

  <button
    type="button"
    className="pp-btn-press"
    style={{
      ...styles.editBtn,
      flex: 1,
      padding: "14px 22px",
      fontSize: 16,
    }}
    onClick={() => setShowRecommendedPage(true)}
  >
    💡 Recommended Projects
  </button>
</div>
        </div>
      )}

      {user.role === "Course Instructor" && pendingInvitations.length > 0 && (
        <div
          style={{
            background: "rgba(251, 191, 36, 0.12)",
            border: "1px solid rgba(251, 191, 36, 0.35)",
            padding: 14,
            borderRadius: 12,
            marginBottom: 18,
            color: "#fcd34d",
            fontWeight: 700,
          }}
        >
          You have {pendingInvitations.length} pending project invitation(s).
        </div>
      )}

      {user.role === "Student" && studentProjectFormOpen && (
        <div style={styles.formSection}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#f1f5f9",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              {editingId ? "Update project" : "Create a new project"}
            </h3>
            <button
              type="button"
              className="pp-btn-press"
              style={styles.cancelBtn}
              onClick={() => {
                clearForm();
                setStudentProjectFormOpen(false);
              }}
            >
              ← Back to projects
            </button>
          </div>
          <label style={styles.label}>Project Title</label>
          <input
            style={{
              ...styles.input,
              ...(projectFieldErrors.title ? styles.inputErrorBorder : {}),
            }}
            placeholder="Project title"
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              clearProjectError("title");
            }}
          />
          {projectFieldErrors.title ? (
            <p className="ui-error-text" role="alert">
              {projectFieldErrors.title}
            </p>
          ) : null}

          <label style={styles.label}>Course</label>
          <select
            style={{
              ...styles.input,
              ...(projectFieldErrors.course ? styles.inputErrorBorder : {}),
            }}
            value={form.course}
            onChange={(e) => {
              setForm({
                ...form,
                course: e.target.value,
                theses:
                  e.target.value === "CSEN 801 - Bachelor Project"
                    ? form.theses
                    : [],
              });
              clearProjectError("course");
              clearProjectError("theses");
            }}
          >
            {courses.map((course) => (
              <option key={course}>{course}</option>
            ))}
          </select>
          {projectFieldErrors.course ? (
            <p className="ui-error-text" role="alert">
              {projectFieldErrors.course}
            </p>
          ) : null}

          {form.course === "CSEN 801 - Bachelor Project" && (
            <>
              <label style={styles.label}>Upload Thesis Drafts</label>

              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                PDF only · You can upload more than one draft · Max 5MB each
              </p>

              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleThesisUpload}
              />

              {thesisUploadError ? (
                <p className="ui-error-text" role="alert">
                  {thesisUploadError}
                </p>
              ) : null}

              {projectFieldErrors.theses ? (
                <p className="ui-error-text" role="alert">
                  {projectFieldErrors.theses}
                </p>
              ) : null}

              {form.theses.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {form.theses.map((draft, index) => (
                    <p key={index} style={{ color: "#e2e8f0", fontSize: 14 }}>
                      {draft.name}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          <label style={styles.label}>GitHub Link</label>
          <input
            style={{
              ...styles.input,
              ...(projectFieldErrors.github ? styles.inputErrorBorder : {}),
            }}
            placeholder="GitHub link"
            value={form.github}
            onChange={(e) => {
              setForm({ ...form, github: e.target.value });
              clearProjectError("github");
            }}
          />
          {projectFieldErrors.github ? (
            <p className="ui-error-text" role="alert">
              {projectFieldErrors.github}
            </p>
          ) : null}

          <label style={styles.label}>Project Report</label>
          <textarea
            style={{
              ...styles.textarea,
              ...(projectFieldErrors.report ? styles.inputErrorBorder : {}),
            }}
            placeholder="Write project report summary here"
            value={form.report}
            onChange={(e) => {
              setForm({ ...form, report: e.target.value });
              clearProjectError("report");
            }}
          />
          {projectFieldErrors.report ? (
            <p className="ui-error-text" role="alert">
              {projectFieldErrors.report}
            </p>
          ) : null}

          <label style={styles.label}>Programming Languages Used</label>
          <input
            style={{
              ...styles.input,
              ...(projectFieldErrors.languages ? styles.inputErrorBorder : {}),
            }}
            placeholder="Example: JavaScript, React, CSS"
            value={form.languages}
            onChange={(e) => {
              setForm({ ...form, languages: e.target.value });
              clearProjectError("languages");
            }}
          />
          {projectFieldErrors.languages ? (
            <p className="ui-error-text" role="alert">
              {projectFieldErrors.languages}
            </p>
          ) : null}

          <label style={styles.label}>Short Demo Video Link</label>
          <input
            style={{
              ...styles.input,
              ...(projectFieldErrors.demo ? styles.inputErrorBorder : {}),
            }}
            placeholder="Demo video link"
            value={form.demo}
            onChange={(e) => {
              setForm({ ...form, demo: e.target.value });
              clearProjectError("demo");
            }}
          />
          {projectFieldErrors.demo ? (
            <p className="ui-error-text" role="alert">
              {projectFieldErrors.demo}
            </p>
          ) : null}

          <label style={styles.label}>Visibility</label>
          <select
            style={styles.input}
            value={form.visibility}
            onChange={(e) => setForm({ ...form, visibility: e.target.value })}
          >
            <option>Private</option>
            <option>Public</option>
          </select>

          <button
            type="button"
            className="pp-btn-press"
            style={styles.saveBtn}
            onClick={addOrUpdateProject}
          >
            {editingId ? "Update Project" : "Create Project"}
          </button>

          {editingId && (
            <button
              type="button"
              className="pp-btn-press"
              style={styles.cancelBtn}
              onClick={clearForm}
            >
              Cancel Edit
            </button>
          )}
        </div>
      )}

      {user.role === "Course Instructor" && (
        <div style={styles.profileCard}>
          <h3 style={styles.sectionTitle}>
            My Project Invitations{" "}
            {pendingInvitations.length > 0 && (
              <span style={{ color: "red" }}>({pendingInvitations.length})</span>
            )}
          </h3>

          {myInstructorInvitations.length === 0 ? (
            <p style={styles.infoValue}>No invitations yet.</p>
          ) : (
            myInstructorInvitations.map((p) => {
              const invitation = (p.invitations || []).find(
                (inv) => inv.email === user.email
              );

              return (
                <div key={p.id} style={styles.projectCard}>
                  <h3>{p.title}</h3>
                  <p>Student: {p.ownerName || p.owner}</p>
                  <p>Course: {p.course}</p>
                  <p>Status: {invitation.status}</p>

                  {invitation.status === "No Reply" && (
                    <>
                      <button
                        type="button"
                        className="pp-btn-press"
                        style={styles.saveBtn}
                        onClick={() => respondToInvitation(p.id, "Accepted")}
                      >
                        Accept Invitation
                      </button>

                      <button
                        type="button"
                        className="pp-btn-press"
                        style={styles.deleteBtn}
                        onClick={() => respondToInvitation(p.id, "Rejected")}
                      >
                        Reject Invitation
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}


      {user.role === "Student" && !studentProjectFormOpen && (
        <div style={styles.profileCard}>
          <h3 style={styles.sectionTitle}>My Project Statistics</h3>

          <div className="pd-stat-grid" style={{ marginBottom: 20 }}>
            <div className="pd-stat-card">
              <h3 className="pd-stat-num">{myProjects.length}</h3>
              <p className="pd-stat-label">Total projects in my portfolio</p>
            </div>

            <div className="pd-stat-card">
              <h3 className="pd-stat-num">{languageStatistics.length}</h3>
              <p className="pd-stat-label">Programming languages used</p>
            </div>
          </div>

          <h4 style={{ color: "#f8fafc", marginBottom: 10 }}>
            Programming languages used overall
          </h4>

          {languageChartData.length === 0 ? (
            <p style={styles.infoValue}>No programming languages added yet.</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <PieChart width={360} height={320}>
                <Pie
                  data={languageChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {languageChartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={LANGUAGE_CHART_COLORS[index % LANGUAGE_CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value}% (${props.payload.count} use${
                      props.payload.count === 1 ? "" : "s"
                    })`,
                    name,
                  ]}
                />
                <Legend />
              </PieChart>

              <div style={{ display: "grid", gap: 10, width: "100%" }}>
                {languageStatistics.map((item) => (
                  <div key={item.language} style={styles.projectCard}>
                    <p style={{ margin: 0, fontWeight: "bold", color: "#f8fafc" }}>
                      {item.language}
                    </p>
                    <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
                      {item.percentage}% of my project technology stack
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h4 style={{ color: "#f8fafc", marginTop: 22, marginBottom: 10 }}>
            Top collaborators per project
          </h4>

          {collaboratorStatistics.length === 0 ? (
            <p style={styles.infoValue}>No projects available yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {collaboratorStatistics.map((project) => (
                <div key={project.projectId} style={styles.projectCard}>
                  <p style={{ margin: 0, fontWeight: "bold", color: "#f8fafc" }}>
                    {project.projectTitle}
                  </p>

                  {project.collaborators.length === 0 ? (
                    <p style={{ color: "#94a3b8" }}>
                      No accepted collaborators yet.
                    </p>
                  ) : (
                    project.collaborators.map((collaborator) => (
                      <p
                        key={collaborator.email}
                        style={{ margin: "6px 0", color: "#cbd5e1" }}
                      >
                        {collaborator.name || "Collaborator"} — {collaborator.email}
                      </p>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>Portfolios & projects</h3>
      

      {visibleProjects.length === 0 ? (
        <p style={styles.infoValue}>No projects available.</p>
      ) : (
        <>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
  <button
    type="button"
    className="pp-btn-press"
    style={showFavoritesOnly ? styles.cancelBtn : styles.saveBtn}
    onClick={() => setShowFavoritesOnly(false)}
  >
    All Projects
  </button>

  <button
    type="button"
    className="pp-btn-press"
    style={{
      ...(showFavoritesOnly ? styles.saveBtn : styles.cancelBtn),
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
    onClick={() => setShowFavoritesOnly(true)}
  >
    ⭐ My Favorites
  </button>
</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <input
              type="search"
              aria-label="Search portfolios by title, student name, or email"
              placeholder="Search by project title, student name, or email…"
              value={projectSearchQuery}
              onChange={(e) => {
                setProjectSearchQuery(e.target.value);
                setSelectedPortfolioId(null);
              }}
              style={{
                ...styles.input,
                flex: "1 1 220px",
                maxWidth: 420,
                marginBottom: 0,
              }}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#94a3b8",
              }}
            >
              <span style={{ whiteSpace: "nowrap" }}>Sort by</span>
              <select
                aria-label="Sort projects"
                value={projectSortMode}
                onChange={(e) => {
                  setProjectSortMode(e.target.value);
                  setSelectedPortfolioId(null);
                }}
                style={{
                  ...styles.input,
                  marginBottom: 0,
                  minWidth: 220,
                  cursor: "pointer",
                }}
              >
                <option value="creation-desc">Creation date — newest first</option>
                <option value="creation-asc">Creation date — oldest first</option>
                <option value="rating-desc">
                  Instructor rating — highest first
                </option>
                <option value="rating-asc">
                  Instructor rating — lowest first
                </option>
              </select>
            </label>
          </div>
          {projectSearchQuery.trim() ? (
            <p style={{ ...styles.infoValue, marginTop: 0, marginBottom: 12 }}>
              {`Showing ${displayedProjects.length} of ${visibleProjects.length} project${
                visibleProjects.length !== 1 ? "s" : ""
              } matching "${projectSearchQuery.trim()}" (title, student name, or email).`}
            </p>
          ) : null}
          {displayedProjects.length === 0 ? (
            <p style={styles.infoValue}>
              No portfolios match your search. Try another project title,
              student name, or email.
            </p>
          ) : (
            displayedProjects.map((p) => {
          const courseInstructors = getCourseInstructors(p.course);
          const isExpanded =
            selectedPortfolioId != null &&
            String(selectedPortfolioId) === String(p.id);

          return (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="pp-btn-press"
                aria-expanded={isExpanded}
                aria-controls={`portfolio-details-${p.id}`}
                id={`portfolio-trigger-${p.id}`}
                onClick={() =>
                  setSelectedPortfolioId((prev) =>
                    String(prev) === String(p.id) ? null : p.id
                  )
                }
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1px solid ${
                    isExpanded
                      ? "rgba(99, 102, 241, 0.45)"
                      : "rgba(255, 255, 255, 0.12)"
                  }`,
                  background: isExpanded
                    ? "rgba(79, 70, 229, 0.15)"
                    : "rgba(255, 255, 255, 0.05)",
                  color: "#f1f5f9",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: isExpanded ? 12 : 0,
                }}
              >
                {p.title}
              </button>
              {isExpanded ? (
            <div
              id={`portfolio-details-${p.id}`}
              role="region"
              aria-labelledby={`portfolio-trigger-${p.id}`}
              style={styles.projectCard}
            >
              <h3 style={{ marginTop: 0 }}>{p.title}</h3>
              {canUseFavorites() && (
  <button
    type="button"
    className="pp-btn-press"
    style={{
      ...(isFavorite(p.id) ? styles.deleteBtn : styles.saveBtn),
      marginBottom: 12,
    }}
    onClick={() => toggleFavorite(p.id)}
  >
    {isFavorite(p.id)
      ? "★ Remove from Favorites"
      : "☆ Save to Favorites"}
  </button>
)}
              <p
                style={{
                  margin: "4px 0 12px",
                  fontSize: 13,
                  color: "#94a3b8",
                  lineHeight: 1.45,
                }}
              >
                <span style={{ fontWeight: 700, color: "#cbd5e1" }}>
                  Student / owner:
                </span>{" "}
                {p.ownerName || "—"}{" "}
                <span style={{ color: "#64748b" }}>({p.owner})</span>
              </p>

              <p>Course: {p.course}</p>
              <p>GitHub: {p.github}</p>
              <p>Project Report: {p.report}</p>
              <p>Languages: {p.languages}</p>
              <p>Demo Video: {p.demo}</p>
              <p>Created On: {p.creationDate}</p>

              <p>
                Visibility:{" "}
                <span
                  style={{
                    color: p.visibility === "Public" ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {p.visibility === "Public" ? "🌍 Public" : "🔒 Private"}
                </span>
              </p>

              {((p.tasks || []).length > 0 || isStudentProjectCreator(p)) && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: "0 0 6px", color: "#e2e8f0" }}>
                    Tasks on this project
                  </h4>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      margin: "0 0 12px",
                      lineHeight: 1.45,
                    }}
                  >
                    {isStudentProjectCreator(p)
                      ? `Tasks for “${p.title}” are ordered by importance (top = highest). You manage this roadmap — add, reorder, or remove tasks. Invited instructors can comment on tasks and on the whole project below.`
                      : isAcceptedCourseInstructorProject(p)
                        ? `Tasks for “${p.title}” reflect the student’s priorities (top = most important). Add or edit feedback per task here; use the whole-project section below for portfolio-level review.`
                        : `Tasks listed for “${p.title}” — order shows the owner’s priority (top = most important).`}
                  </p>

                  {(p.tasks || []).length === 0 && isStudentProjectCreator(p) ? (
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 10px" }}>
                      {`No tasks yet for “${p.title}”. Add milestones below to plan this project.`}
                    </p>
                  ) : null}

                  {(p.tasks || []).map((task, index) => {
                    const total = (p.tasks || []).length;
                    const canEditTasks = isStudentProjectCreator(p);
                    const showInstructorTaskFeedback =
                      isAcceptedCourseInstructorProject(p);

                    return (
                      <div
                        key={task.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          padding: "10px 12px",
                          marginBottom: 8,
                          borderRadius: 10,
                          border: "1px solid rgba(59, 130, 246, 0.22)",
                          background: "rgba(0, 0, 0, 0.22)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#93c5fd",
                              minWidth: 128,
                            }}
                          >
                            {taskImportanceLabel(index, total)}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              minWidth: 160,
                              color: "#e2e8f0",
                              fontSize: 14,
                            }}
                          >
                            {task.title}
                          </span>
                          {canEditTasks ? (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              <button
                                type="button"
                                className="pp-btn-press"
                                style={{
                                  ...styles.editBtn,
                                  fontSize: 12,
                                  padding: "6px 10px",
                                }}
                                disabled={index === 0}
                                title="Move up = higher importance"
                                onClick={() => moveProjectTask(p.id, task.id, -1)}
                              >
                                ↑ Higher priority
                              </button>
                              <button
                                type="button"
                                className="pp-btn-press"
                                style={{
                                  ...styles.editBtn,
                                  fontSize: 12,
                                  padding: "6px 10px",
                                }}
                                disabled={index >= total - 1}
                                title="Move down = lower importance"
                                onClick={() => moveProjectTask(p.id, task.id, 1)}
                              >
                                ↓ Lower priority
                              </button>
                              <button
                                type="button"
                                className="pp-btn-press"
                                style={{
                                  ...styles.deleteBtn,
                                  fontSize: 12,
                                  padding: "6px 10px",
                                }}
                                onClick={() => removeProjectTask(p.id, task.id)}
                              >
                                Remove
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {showInstructorTaskFeedback ? (
                          <div
                            style={{
                              marginTop: 8,
                              padding: 16,
                              borderRadius: 14,
                              border: "1px solid rgba(129, 140, 248, 0.42)",
                              background:
                                "linear-gradient(165deg, rgba(79, 70, 229, 0.2) 0%, rgba(15, 23, 42, 0.55) 100%)",
                              boxShadow:
                                "0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 32px rgba(0,0,0,0.25)",
                            }}
                          >
                            <h4
                              style={{
                                margin: "0 0 6px",
                                color: "#eef2ff",
                                fontSize: 17,
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                              }}
                            >
                              Task feedback within{" "}
                              <span style={{ color: "#e0e7ff" }}>{p.title}</span>
                            </h4>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#a5b4fc",
                                margin: "0 0 12px",
                                lineHeight: 1.5,
                              }}
                            >
                              This applies to this task only. Use{" "}
                              <strong style={{ color: "#e0e7ff" }}>
                                Whole-project review
                              </strong>{" "}
                              below for portfolio-level rating and comments.
                            </p>
                            <textarea
                              style={{
                                ...styles.input,
                                width: "100%",
                                minHeight: 72,
                                marginBottom: 8,
                                resize: "vertical",
                                boxSizing: "border-box",
                              }}
                              placeholder={`Notes on "${task.title}" as part of "${p.title}"…`}
                              value={getTaskCommentDraft(p, task.id)}
                              onChange={(e) =>
                                setInstructorDrafts((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...prev[p.id],
                                    tasks: {
                                      ...(prev[p.id]?.tasks || {}),
                                      [task.id]: e.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 12,
                                alignItems: "center",
                              }}
                            >
                              <button
                                type="button"
                                className="pp-btn-press"
                                style={styles.instructorFeedbackPrimaryBtn}
                                onClick={() => {
                                  const text = getTaskCommentDraft(
                                    p,
                                    task.id
                                  ).trim();
                                  applyInstructorReviewUpdate(p.id, (m) => {
                                    const tc = { ...m.taskComments };
                                    if (text) tc[task.id] = text;
                                    else delete tc[task.id];
                                    return { ...m, taskComments: tc };
                                  });
                                  clearTaskCommentDraft(p, task.id);
                                }}
                              >
                                Save task feedback
                              </button>
                              <button
                                type="button"
                                className="pp-btn-press"
                                style={styles.instructorFeedbackDangerBtn}
                                onClick={() => {
                                  applyInstructorReviewUpdate(p.id, (m) => {
                                    const tc = { ...m.taskComments };
                                    delete tc[task.id];
                                    return { ...m, taskComments: tc };
                                  });
                                  clearTaskCommentDraft(p, task.id);
                                }}
                              >
                                Remove task comment
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {isStudentProjectCreator(p) ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <input
                        style={{
                          ...styles.input,
                          flex: 1,
                          minWidth: 200,
                          marginBottom: 0,
                        }}
                        placeholder={`Add a task or milestone for "${p.title}"…`}
                        value={taskDraftByProjectId[p.id] ?? ""}
                        onChange={(e) =>
                          setTaskDraftByProjectId((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addProjectTask(
                              p.id,
                              taskDraftByProjectId[p.id] ?? ""
                            );
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="pp-btn-press"
                        style={styles.saveBtn}
                        onClick={() =>
                          addProjectTask(p.id, taskDraftByProjectId[p.id] ?? "")
                        }
                      >
                        Add task
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {isAcceptedCourseInstructorProject(p) ? (
                <div
                  style={{
                    marginTop: 18,
                    padding: 16,
                    borderRadius: 14,
                    border: "1px solid rgba(129, 140, 248, 0.42)",
                    background:
                      "linear-gradient(165deg, rgba(79, 70, 229, 0.2) 0%, rgba(15, 23, 42, 0.55) 100%)",
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 32px rgba(0,0,0,0.25)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 6px",
                      color: "#eef2ff",
                      fontSize: 17,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Whole-project review
                  </h4>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#a5b4fc",
                      margin: "0 0 16px",
                      lineHeight: 1.5,
                    }}
                  >
                    For{" "}
                    <strong style={{ color: "#e0e7ff" }}>{p.title}</strong>,
                    rate and comment on the{" "}
                    <strong style={{ color: "#e0e7ff" }}>
                      entire portfolio
                    </strong>{" "}
                    (scope, deliverables, documentation, demo — not one task
                    alone). Saved feedback appears on this project card for the
                    student and other viewers.
                  </p>

                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#c7d2fe",
                    }}
                  >
                    Whole-project rating (optional)
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((n) => {
                      const rev = getMyInstructorReview(p);
                      const rating = rev.projectRating;
                      const active =
                        rating != null && !Number.isNaN(Number(rating)) && n <= rating;
                      return (
                        <button
                          key={n}
                          type="button"
                          className="pp-btn-press"
                          title={`Set whole-project rating for "${p.title}" to ${n}/5 (click again to clear)`}
                          aria-label={`Whole project: ${n} out of 5 stars`}
                          aria-pressed={active}
                          onClick={() => {
                            const cur = getMyInstructorReview(p).projectRating;
                            const next = cur === n ? null : n;
                            applyInstructorReviewUpdate(p.id, (m) => ({
                              ...m,
                              projectRating: m.projectRating === n ? null : n,
                            }));
                            if (next == null) {
                              flashWholeProjectHint(
                                p.id,
                                "Whole-project rating cleared."
                              );
                            } else {
                              flashWholeProjectHint(
                                p.id,
                                `Whole-project rating saved: ${next}/5.`
                              );
                            }
                          }}
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            border: active
                              ? "1px solid rgba(251, 191, 36, 0.9)"
                              : "1px solid rgba(148, 163, 184, 0.4)",
                            background: active
                              ? "rgba(251, 191, 36, 0.28)"
                              : "rgba(15, 23, 42, 0.45)",
                            color: active ? "#fef3c7" : "#64748b",
                            cursor: "pointer",
                            fontSize: 19,
                            lineHeight: 1,
                          }}
                        >
                          ★
                        </button>
                      );
                    })}
                    {getMyInstructorReview(p).projectRating != null ? (
                      <button
                        type="button"
                        className="pp-btn-press"
                        title="Remove the overall whole-project rating"
                        style={styles.instructorFeedbackDangerBtn}
                        onClick={() => {
                          applyInstructorReviewUpdate(p.id, (m) => ({
                            ...m,
                            projectRating: null,
                          }));
                          flashWholeProjectHint(
                            p.id,
                            "Whole-project rating cleared."
                          );
                        }}
                      >
                        Clear whole-project rating
                      </button>
                    ) : null}
                  </div>
                  <p
                    style={{
                      margin: "0 0 14px",
                      fontSize: 12,
                      color: "#c4b5fd",
                    }}
                  >
                    {(() => {
                      const r = getMyInstructorReview(p).projectRating;
                      if (r != null && !Number.isNaN(Number(r))) {
                        return `Your rating for "${p.title}" (whole project): ${Math.min(5, Math.max(1, Math.round(Number(r))))}/5.`;
                      }
                      return `No whole-project rating for "${p.title}" yet — pick 1–5 stars above.`;
                    })()}
                  </p>

                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#c7d2fe",
                    }}
                  >
                    Whole-project written feedback
                  </p>
                  <textarea
                    aria-label="Whole project written feedback"
                    style={{
                      ...styles.input,
                      width: "100%",
                      minHeight: 96,
                      marginBottom: 8,
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                    placeholder={`Summarize "${p.title}" as a whole: goals, delivery quality, report / repo / demo, teamwork…`}
                    value={getProjectCommentDraft(p)}
                    onChange={(e) =>
                      setInstructorDrafts((prev) => ({
                        ...prev,
                        [p.id]: {
                          ...prev[p.id],
                          projectComment: e.target.value,
                        },
                      }))
                    }
                  />
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      className="pp-btn-press"
                      title="Publish your written summary for the whole project"
                      style={styles.instructorFeedbackPrimaryBtn}
                      onClick={() => {
                        const text = getProjectCommentDraft(p).trim();
                        applyInstructorReviewUpdate(p.id, (m) => ({
                          ...m,
                          projectComment: text,
                        }));
                        clearProjectCommentDraft(p);
                        flashWholeProjectHint(
                          p.id,
                          text
                            ? "Whole-project written feedback saved."
                            : "Whole-project comment cleared (empty)."
                        );
                      }}
                    >
                      Save whole-project feedback
                    </button>
                    <button
                      type="button"
                      className="pp-btn-press"
                      title="Delete your written whole-project comment"
                      style={styles.instructorFeedbackDangerBtn}
                      onClick={() => {
                        applyInstructorReviewUpdate(p.id, (m) => ({
                          ...m,
                          projectComment: "",
                        }));
                        clearProjectCommentDraft(p);
                        flashWholeProjectHint(
                          p.id,
                          "Whole-project written feedback removed."
                        );
                      }}
                    >
                      Remove whole-project comment
                    </button>
                  </div>
                  {instructorWholeProjectHint[p.id] ? (
                    <p
                      role="status"
                      aria-live="polite"
                      style={{
                        margin: "12px 0 0",
                        padding: "10px 12px",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#dcfce7",
                        background: "rgba(22, 163, 74, 0.22)",
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                      }}
                    >
                      {instructorWholeProjectHint[p.id]}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {user.role === "Student" &&
                p.owner === user.email &&
                p.theses &&
                p.theses.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <h4>Thesis Drafts</h4>

                    {p.theses.map((draft, index) => (
                      <div key={index} style={{ marginBottom: 12 }}>
                        <p>
                          📄 {draft.name}{" "}
                          {draft.isFinal && (
                            <span
                              style={{
                                color: "green",
                                fontWeight: "bold",
                              }}
                            >
                              ⭐ Final Draft
                            </span>
                          )}
                        </p>

                        <button
                          type="button"
                          className="pp-btn-press"
                          style={styles.editBtn}
                          onClick={() => {
                            const pdfWindow = window.open("");
                            pdfWindow.document.write(
                              `<iframe width="100%" height="100%" src="${draft.data}"></iframe>`
                            );
                          }}
                        >
                          View Draft
                        </button>

                        <a href={draft.data} download={draft.name}>
                          <button type="button" className="pp-btn-press" style={styles.saveBtn}>
                            Download Draft
                          </button>
                        </a>

                        <button
                          type="button"
                          className="pp-btn-press"
                          style={styles.editBtn}
                          onClick={() => setFinalDraft(p.id, index)}
                        >
                          Set as Final Draft
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              {user.role === "Student" && p.owner === user.email && (
                <>
                  <div style={styles.btnRow}>
                    <button
                      type="button"
                      className="pp-btn-press"
                      style={styles.editBtn}
                      onClick={() => editProject(p)}
                    >
                      Update
                    </button>

                    <button
                      type="button"
                      className="pp-btn-press"
                      style={styles.deleteBtn}
                      onClick={() => deleteProject(p.id)}
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      className="pp-btn-press"
                      style={styles.editBtn}
                      onClick={() => toggleProjectVisibility(p.id)}
                    >
                      Change Visibility
                    </button>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <h4>Invite Course Instructor</h4>

                    {inviteFeedback && inviteFeedback.projectId === p.id ? (
                      <p
                        className={
                          inviteFeedback.variant === "error"
                            ? "ui-error-text"
                            : "ui-success-text"
                        }
                        role="alert"
                      >
                        {inviteFeedback.message}
                      </p>
                    ) : null}

                    {courseInstructors.length === 0 ? (
                      <p style={styles.infoValue}>
                        No course instructors linked to this course.
                      </p>
                    ) : (
                      courseInstructors.map((instructor) => {
                        const existingInvitation = (p.invitations || []).find(
                          (inv) => inv.email === instructor.email
                        );

                        return (
                          <div key={instructor.email} style={styles.infoRow}>
                            <span style={styles.infoValue}>
                              {instructor.firstName} {instructor.lastName} -{" "}
                              {instructor.email}
                            </span>

                            {existingInvitation ? (
                              <span style={{ fontWeight: "bold" }}>
                                Status: {existingInvitation.status}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="pp-btn-press"
                                style={styles.saveBtn}
                                onClick={() =>
                                  inviteInstructor(p.id, instructor)
                                }
                              >
                                Send Invitation
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {(p.invitations || []).length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h4>Invitation Status</h4>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px" }}>
                        Remove an invited instructor if they should no longer be
                        linked to this project.
                      </p>

                      {(p.invitations || []).map((inv) => (
                        <div
                          key={inv.email}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <p style={{ margin: 0, color: "#e2e8f0", fontSize: 14 }}>
                            {inv.name} — {inv.email} —{" "}
                            <strong>{inv.status}</strong>
                          </p>
                          <button
                            type="button"
                            className="pp-btn-press"
                            style={{
                              ...styles.deleteBtn,
                              fontSize: 12,
                              padding: "6px 12px",
                            }}
                            onClick={() =>
                              removeProjectCollaborator(p.id, inv.email)
                            }
                          >
                            Remove collaborator
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {showAggregatedInstructorFeedback(p) ? (
                <div
                  style={{
                    marginTop: 18,
                    padding: 16,
                    borderRadius: 14,
                    border: "1px solid rgba(129, 140, 248, 0.35)",
                    background:
                      "linear-gradient(165deg, rgba(49, 46, 129, 0.35) 0%, rgba(15, 23, 42, 0.72) 100%)",
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.05) inset, 0 10px 28px rgba(0,0,0,0.28)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 4px",
                      color: "#eef2ff",
                      fontSize: 17,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Whole-project instructor reviews
                  </h4>
                  <p
                    style={{
                      margin: "0 0 16px",
                      fontSize: 12,
                      color: "#a5b4fc",
                      lineHeight: 1.5,
                    }}
                  >
                    Holistic feedback on{" "}
                    <strong style={{ color: "#e0e7ff" }}>{p.title}</strong> as
                    a complete portfolio. Task-level notes are listed separately
                    when provided.
                  </p>
                  {Object.entries(p.instructorReviews || {})
                    .filter(([, rev]) => instructorReviewHasContent(rev))
                    .map(([email, rev]) => (
                      <div
                        key={email}
                        style={{
                          marginBottom: 16,
                          paddingBottom: 16,
                          borderBottom:
                            "1px solid rgba(99, 102, 241, 0.22)",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 12px",
                            fontWeight: 800,
                            color: "#e0e7ff",
                            fontSize: 14,
                          }}
                        >
                          {instructorDisplayName(email)}
                        </p>

                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: "rgba(15, 23, 42, 0.45)",
                            border: "1px solid rgba(99, 102, 241, 0.2)",
                            marginBottom: 10,
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 6px",
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "#818cf8",
                            }}
                          >
                            Whole project
                          </p>
                          {rev.projectRating != null &&
                          !Number.isNaN(Number(rev.projectRating)) ? (
                            <p
                              style={{
                                margin: "0 0 8px",
                                fontSize: 13,
                                color: "#fde68a",
                                fontWeight: 700,
                              }}
                            >
                              Portfolio rating:{" "}
                              {Math.min(
                                5,
                                Math.max(
                                  1,
                                  Math.round(Number(rev.projectRating))
                                )
                              )}
                              /5{" "}
                              <span aria-hidden style={{ color: "#fcd34d" }}>
                                {"★".repeat(
                                  Math.min(
                                    5,
                                    Math.max(
                                      1,
                                      Math.round(Number(rev.projectRating))
                                    )
                                  )
                                )}
                              </span>
                            </p>
                          ) : (
                            <p
                              style={{
                                margin: "0 0 8px",
                                fontSize: 12,
                                color: "#64748b",
                                fontStyle: "italic",
                              }}
                            >
                              No whole-project rating.
                            </p>
                          )}
                          {String(rev.projectComment || "").trim() ? (
                            <p
                              style={{
                                margin: 0,
                                fontSize: 13,
                                color: "#e2e8f0",
                                lineHeight: 1.55,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#94a3b8",
                                  marginBottom: 4,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Whole-project summary
                              </span>
                              {String(rev.projectComment).trim()}
                            </p>
                          ) : (
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "#64748b",
                                fontStyle: "italic",
                              }}
                            >
                              No whole-project written summary.
                            </p>
                          )}
                        </div>

                        {Object.entries(rev.taskComments || {}).filter(
                          ([, txt]) => String(txt || "").trim()
                        ).length > 0 ? (
                          <div
                            style={{
                              marginTop: 4,
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(148, 163, 184, 0.2)",
                              background: "rgba(0, 0, 0, 0.2)",
                            }}
                          >
                            <p
                              style={{
                                margin: "0 0 8px",
                                fontSize: 11,
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "#94a3b8",
                              }}
                            >
                              Task-level notes (within this project)
                            </p>
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: 18,
                                color: "#cbd5e1",
                                fontSize: 13,
                                lineHeight: 1.45,
                              }}
                            >
                              {Object.entries(rev.taskComments || {})
                                .filter(([, txt]) => String(txt || "").trim())
                                .map(([taskId, txt]) => {
                                  const t = (p.tasks || []).find(
                                    (x) => x.id === taskId
                                  );
                                  const title = t
                                    ? t.title
                                    : "Task (removed)";
                                  return (
                                    <li key={taskId} style={{ marginBottom: 6 }}>
                                      <strong style={{ color: "#93c5fd" }}>
                                        {title}
                                      </strong>
                                      : {String(txt).trim()}
                                    </li>
                                  );
                                })}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
              ) : null}
            </div>
          );
            })
          )}
        </>
      )}
    </div>
  );
}
function InstructorSearch({ allProfiles, registeredUsers }) {
  const [query, setQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selected, setSelected] = useState(null);

  const instructors = registeredUsers
    ? registeredUsers.filter((u) => u.role === "Course Instructor")
    : [];

  const results = instructors.filter((u) => {
  const profile = allProfiles[u.email] || {};
  const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();

  const matchesName = fullName.includes(query.toLowerCase());

  const linkedCourses =
    profile.linkedCourses ||
    profile.courses ||
    profile.linked_courses ||
    ["CSEN 801 - Bachelor Project"];

  const matchesCourse =
    !selectedCourse ||
    linkedCourses.some((course) =>
      course.trim().toLowerCase() === selectedCourse.trim().toLowerCase()
    );

  return matchesName && matchesCourse;
});

  return (
    <div style={styles.profileCard}>
      <h2 style={styles.sectionTitle}>🔍 Search Instructors</h2>

      <div style={styles.searchRow}>
        <input
          style={{ ...styles.input, marginBottom: 0, flex: 1 }}
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          style={{ ...styles.input, marginBottom: 0, width: 220 }}
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="">All Courses</option>

          {AVAILABLE_COURSES.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <div style={styles.instructorDetailCard}>
          <button style={styles.cancelBtn} onClick={() => setSelected(null)}>
            ← Back to results
          </button>

          <div style={styles.cardHeader}>
            {allProfiles[selected.email]?.avatar && (
              <img
                src={allProfiles[selected.email].avatar}
                alt="avatar"
                style={{ ...styles.avatarImg, width: 70, height: 70 }}
              />
            )}

            <div>
              <h3 style={{ margin: 0, color: "#f8fafc" }}>
                {selected.firstName} {selected.lastName}
              </h3>

              <p style={styles.emailText}>{selected.email}</p>
            </div>
          </div>

          <InfoRow
            label="Biography"
            value={allProfiles[selected.email]?.bio || "—"}
          />

          <InfoRow
            label="Research Interests"
            value={allProfiles[selected.email]?.research || "—"}
          />

          <InfoRow
            label="Education"
            value={allProfiles[selected.email]?.education || "—"}
          />

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Linked Courses</span>

            <div style={styles.tagList}>
              {(
                allProfiles[selected.email]?.linkedCourses || [
                  "CSEN 801 - Bachelor Project",
                ]
              ).map((course) => (
                <span key={course} style={styles.tag}>
                  {course}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.resultsList}>
          {results.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: 24 }}>
              No instructors found.
            </p>
          ) : (
            results.map((instructor) => (
              <div
                key={instructor.email}
                className="pd-interactive-row"
                style={styles.resultRow}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(instructor)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(instructor);
                  }
                }}
              >
                {allProfiles[instructor.email]?.avatar ? (
                  <img
                    src={allProfiles[instructor.email].avatar}
                    alt="avatar"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div style={styles.miniAvatar}>
                    {instructor.firstName[0]}
                    {instructor.lastName[0]}
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <strong style={{ color: "#e2e8f0" }}>
                    {instructor.firstName} {instructor.lastName}
                  </strong>

                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                    {instructor.email}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MessagesPage({ user }) {
  const usesSplitMessagesUi = [
    "Student",
    "Employer",
    "Course Instructor",
  ].includes(user.role);

  const [messagesScreen, setMessagesScreen] = useState(
    usesSplitMessagesUi ? "inbox" : "compose"
  );

  const [messages, setMessages] = useState(() => {
    return JSON.parse(localStorage.getItem("messages")) || [];
  });

  const [receiverEmail, setReceiverEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [sendFeedback, setSendFeedback] = useState(null);

  const users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
  const otherUsers = users.filter((u) => u.email !== user.email);

  const myMessages = messages.filter(
    (m) => m.senderEmail === user.email || m.receiverEmail === user.email
  );

  useEffect(() => {
    const updatedMessages = messages.map((m) =>
      m.receiverEmail === user.email ? { ...m, read: true } : m
    );

    setMessages(updatedMessages);
    localStorage.setItem("messages", JSON.stringify(updatedMessages));
    window.dispatchEvent(new Event("messagesUpdated"));
  }, []);

  function sendMessage() {
    if (!receiverEmail || !text.trim()) {
      setSendFeedback({
        variant: "error",
        text: "Please choose a receiver and write a message.",
      });
      return;
    }

    try {
      const receiver = users.find((u) => u.email === receiverEmail);

      const senderName =
        user.role === "Employer"
          ? user.companyName
          : `${user.firstName} ${user.lastName}`;

      const receiverName = receiver
        ? receiver.role === "Employer"
          ? receiver.companyName
          : `${receiver.firstName} ${receiver.lastName}`
        : receiverEmail;

      const newMessage = {
        id: Date.now(),
        senderEmail: user.email,
        senderName,
        receiverEmail,
        receiverName,
        subject: subject || "Private Message",
        text,
        date: new Date().toLocaleString(),
        read: false,
      };

      const updatedMessages = [newMessage, ...messages];
      setMessages(updatedMessages);
      localStorage.setItem("messages", JSON.stringify(updatedMessages));

      const notifications =
        JSON.parse(localStorage.getItem("notifications")) || [];

      const newNotification = {
        id: Date.now() + 1,
        userEmail: receiverEmail,
        text: `You have received a new message from ${senderName}`,
        read: false,
        type: "message",
        date: new Date().toLocaleString(),
      };

      localStorage.setItem(
        "notifications",
        JSON.stringify([newNotification, ...notifications])
      );

      window.dispatchEvent(new Event("messagesUpdated"));
      window.dispatchEvent(new Event("notificationsUpdated"));

      setReceiverEmail("");
      setSubject("");
      setText("");
      setSendFeedback({
        variant: "success",
        text: "Message sent successfully!",
      });
    } catch (err) {
      setSendFeedback({
        variant: "error",
        text:
          err?.message ||
          "Something went wrong while sending. Please try again.",
      });
    }
  }

  const showComposeForm =
    !usesSplitMessagesUi || messagesScreen === "compose";

  function openNewMessage() {
    setReceiverEmail("");
    setSubject("");
    setText("");
    setSendFeedback(null);
    setMessagesScreen("compose");
  }

  function backToInbox() {
    setSendFeedback(null);
    setMessagesScreen("inbox");
  }

  return (
    <div style={styles.profileCard}>
      <h2 style={styles.sectionTitle}>My Messages</h2>

      {usesSplitMessagesUi && messagesScreen === "inbox" && (
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            className="pp-btn-press"
            style={{
              ...styles.saveBtn,
              width: "100%",
              padding: "14px 24px",
              fontSize: 15,
            }}
            onClick={openNewMessage}
          >
            New message
          </button>
        </div>
      )}

      {usesSplitMessagesUi && messagesScreen === "compose" && (
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
            onClick={backToInbox}
          >
            ← Back
          </button>
        </div>
      )}

      {showComposeForm && (
        <div style={styles.formSection}>
          <h3>Send Private Message</h3>

          <label style={styles.label}>Send To</label>
          <select
            style={styles.input}
            value={receiverEmail}
            onChange={(e) => {
              setReceiverEmail(e.target.value);
              setSendFeedback(null);
            }}
          >
            <option value="">Choose user</option>
            {otherUsers.map((u) => (
              <option key={u.email} value={u.email}>
                {u.role === "Employer"
                  ? u.companyName
                  : `${u.firstName} ${u.lastName}`}{" "}
                — {u.role}
              </option>
            ))}
          </select>

          <label style={styles.label}>Subject</label>
          <input
            style={styles.input}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSendFeedback(null);
            }}
            placeholder="Message subject"
          />

          <label style={styles.label}>Message</label>
          <textarea
            style={styles.textarea}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSendFeedback(null);
            }}
            placeholder="Write your private message."
          />

          {sendFeedback && (
            <p
              role="alert"
              style={{
                margin: "0 0 8px",
                fontSize: 14,
                fontWeight: 500,
                color:
                  sendFeedback.variant === "success" ? "#22c55e" : "#ef4444",
              }}
            >
              {sendFeedback.text}
            </p>
          )}

          <button
            type="button"
            className="pp-btn-press"
            style={styles.saveBtn}
            onClick={sendMessage}
          >
            Send Message
          </button>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>Inbox / Sent Messages</h3>

      {myMessages.length === 0 ? (
        <p style={styles.infoValue}>No messages yet.</p>
      ) : (
        myMessages.map((m) => (
          <div key={m.id} style={styles.projectCard}>
            <h3>{m.subject || "Message"}</h3>
            <p><strong>From:</strong> {m.senderName || m.senderEmail}</p>
            <p><strong>To:</strong> {m.receiverName || m.receiverEmail}</p>
            <p>{m.text}</p>
            <p style={styles.infoValue}>{m.date}</p>
          </div>
        ))
      )}
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

export default function ProfilePage({ user, onLogout }) {
  const [profiles, setProfiles] = useState(loadProfiles);
  const [tab, setTab] = useState("home");
const messages = JSON.parse(localStorage.getItem("messages")) || [];

const unreadMessagesCount = messages.filter(
  (m) => m.receiverEmail === user.email && m.read === false
).length;
  const registeredUsers = (() => {
    try {
      return JSON.parse(localStorage.getItem("registeredUsers")) || [];
    } catch {
      return [];
    }
  })();

  const myProfile = profiles[user.email] || {};

  function handleSave(data) {
    const updated = {
      ...profiles,
      [user.email]: {
        ...myProfile,
        ...data,
      },
    };

    setProfiles(updated);
    saveProfiles(updated);
  }

  const canSearchInstructors = [
    "Student",
    "Administrator",
    "Employer",
    "Course Instructor",
  ].includes(user.role);

  const usesPortalDashboard =
    user.role === "Student" ||
    user.role === "Course Instructor" ||
    user.role === "Employer";

  const dashboardTitle =
    user.role === "Student"
      ? "Student home page"
      : user.role === "Course Instructor"
        ? "Instructor home page"
        : user.role === "Employer"
          ? "Employer home page"
          : "Home page";

  const dashboardSubtitle =
    user.role === "Student"
      ? "Browse internships, project portfolios, and instructor search from your home page."
      : user.role === "Course Instructor"
        ? "Manage internships, portfolios, and instructor directory access from your home page."
        : user.role === "Employer"
          ? "Review internships, project portfolios, and find instructors from your home page."
          : "";

  return (
    <div className="pd-page">
      <nav className="pd-nav pd-nav--app">
        <span className="pd-nav-brand">GUC Portal</span>

        <div className="pd-nav-actions">
          <NotificationBell user={user} />

          <button
            type="button"
            className={
              tab === "profile"
                ? "pd-btn pd-nav-user-btn pd-nav-user-btn--active"
                : "pd-btn pd-nav-user-btn"
            }
            onClick={() => setTab("profile")}
          >
            {user.role === "Employer"
              ? user.companyName
              : `${user.firstName} ${user.lastName}`}
          </button>

          <button
            type="button"
            className="pd-btn pd-nav-message-btn"
            onClick={() => setTab("messages")}
          >
            💬 Messages

            {unreadMessagesCount > 0 && (
              <span className="pd-nav-message-badge">
                {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <div
        className={tab === "projects" ? "pd-main pd-main--wide" : "pd-main"}
      >
        {usesPortalDashboard && tab === "home" && (
          <>
            <header className="pd-page-header">
              <h1 className="pd-page-title">{dashboardTitle}</h1>
              <p className="pd-page-subtitle">{dashboardSubtitle}</p>
            </header>

            <section className="pd-stat-grid" aria-label="Portal destinations">
              {canSearchInstructors ? (
                <button
                  type="button"
                  className="pd-stat-card pd-dashboard-tile"
                  onClick={() => setTab("search")}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "2rem",
                      lineHeight: 1,
                    }}
                    aria-hidden
                  >
                    🔍
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
                    Find Instructors
                  </p>
                  <p className="pd-page-subtitle" style={{ marginTop: 8 }}>
                    Search by name or course.
                  </p>
                </button>
              ) : null}

              <button
                type="button"
                className="pd-stat-card pd-dashboard-tile"
                onClick={() => setTab("internships")}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "2rem",
                    lineHeight: 1,
                  }}
                  aria-hidden
                >
                  💼
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
                  Internships
                </p>
                <p className="pd-page-subtitle" style={{ marginTop: 8 }}>
                  Listings, applications, and status.
                </p>
              </button>

              <button
                type="button"
                className="pd-stat-card pd-dashboard-tile"
                onClick={() => setTab("projects")}
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
          </>
        )}

        {tab === "profile" && (
          <>
            {usesPortalDashboard ? (
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
                  onClick={() => setTab("home")}
                >
                  ← Back
                </button>
              </div>
            ) : null}

            {onLogout && (
              <div className="pd-profile-actions">
                <button
                  type="button"
                  className="pd-btn pd-btn--logout pd-profile-logout-btn"
                  onClick={onLogout}
                >
                  Log out
                </button>
              </div>
            )}

            {user.role === "Student" && (
              <StudentProfile
                user={user}
                profile={myProfile}
                onSave={handleSave}
                onGoToCreateProject={() => {
                  try {
                    sessionStorage.setItem("guc-open-project-create", "1");
                  } catch {
                    /* ignore */
                  }
                  setTab("projects");
                }}
              />
            )}

            {user.role === "Course Instructor" && (
              <InstructorProfile
                user={user}
                profile={myProfile}
                onSave={handleSave}
              />
            )}

            {user.role === "Employer" && (
              <CompanyProfile
                user={user}
                profile={myProfile}
                onSave={handleSave}
              />
            )}

            {user.role === "Administrator" && (
              <div style={styles.profileCard}>
                <h2 style={styles.sectionTitle}>👤 Administrator</h2>
                <p style={{ color: "#94a3b8" }}>
                  You are logged in as Administrator. Use the navigation to
                  manage the platform.
                </p>
              </div>
            )}
          </>
        )}

        {usesPortalDashboard &&
          tab !== "profile" &&
          tab !== "home" && (
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
                onClick={() => setTab("home")}
              >
                ← Back
              </button>
            </div>
          )}

        {tab === "search" && (
          <InstructorSearch
            allProfiles={profiles}
            registeredUsers={registeredUsers}
          />
        )}

        {tab === "internships" && <InternshipSystem user={user} />}

        {tab === "projects" && <ProjectPortfolios user={user} />}
        {tab === "messages" && <MessagesPage user={user} />}
      </div>
    </div>
  );
}

const styles = {
  profileCard: {
    background:
      "linear-gradient(165deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.045) 40%, rgba(6,40,36,0.35) 100%)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderRadius: 22,
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.1) inset, 0 10px 28px rgba(0,0,0,0.28), 0 32px 64px rgba(0,0,0,0.38), 0 0 56px rgba(20,184,166,0.08)",
    padding: 32,
    marginBottom: 24,
    border: "1px solid rgba(59, 130, 246, 0.28)",
    transition:
      "box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s ease",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 24,
    flexWrap: "wrap",
  },

  headerInfo: {
    flex: 1,
  },

  userName: {
    margin: "0 0 4px",
    fontSize: 24,
    color: "#f8fafc",
  },

  roleBadge: {
    display: "inline-block",
    background: "rgba(59, 130, 246, 0.18)",
    color: "#93c5fd",
    borderRadius: 20,
    padding: "3px 12px",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    border: "1px solid rgba(59, 130, 246, 0.4)",
  },

  emailText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 14,
  },

  avatarSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    overflow: "hidden",
    cursor: "pointer",
    position: "relative",
    border: "3px solid rgba(255, 255, 255, 0.2)",
    background: "rgba(0, 0, 0, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  },

  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  avatarPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },

  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    background: "rgba(0,0,0,0.5)",
    color: "#ffffff",
    fontSize: 11,
    textAlign: "center",
    padding: "3px 0",
  },

  logoWarning: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 160,
  },

  formSection: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  viewSection: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  label: {
    fontWeight: 700,
    fontSize: 13,
    color: "#cbd5e1",
    marginBottom: 4,
    marginTop: 12,
  },

  input: {
    border: "1.5px solid #d1d5db",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 4,
    outline: "none",
    color: "#111827",
    background: "#ffffff",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },

  textarea: {
    border: "1.5px solid #d1d5db",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 4,
    resize: "vertical",
    fontFamily: "inherit",
    color: "#111827",
    background: "#ffffff",
    lineHeight: 1.45,
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },

  inputErrorBorder: {
    border: "2px solid #dc2626",
    boxShadow: "0 0 0 2px rgba(220, 38, 38, 0.22)",
  },

  infoRow: {
    display: "flex",
    padding: "14px 0",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    gap: 16,
    alignItems: "flex-start",
  },

  infoLabel: {
    width: 150,
    minWidth: 150,
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: 700,
  },

  infoValue: {
    color: "#e2e8f0",
    fontSize: 14,
    flex: 1,
  },

  link: {
    color: "#93c5fd",
    textDecoration: "none",
    fontSize: 14,
    wordBreak: "break-all",
    fontWeight: 600,
  },

  tagContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 4,
  },

  tagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },

  tag: {
    background: "rgba(59, 130, 246, 0.15)",
    color: "#bfdbfe",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 600,
  },

  tagRemove: {
    background: "none",
    border: "none",
    color: "#93c5fd",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    padding: 0,
  },

  tagInputRow: {
    display: "flex",
    gap: 8,
  },

  addTagBtn: {
    background: "rgba(255, 255, 255, 0.06)",
    border: "1.5px dashed rgba(148, 163, 184, 0.5)",
    borderRadius: 10,
    padding: "9px 14px",
    cursor: "pointer",
    fontSize: 13,
    color: "#e2e8f0",
    marginTop: 4,
    alignSelf: "flex-start",
    fontWeight: 700,
    transition: "background 0.2s ease, border-color 0.2s ease, transform 0.14s ease",
  },

  btnRow: {
    display: "flex",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },

  saveBtn: {
    background: "linear-gradient(145deg, #1d4ed8, #3b82f6)",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "11px 24px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 6px 20px rgba(59, 130, 246, 0.35)",
    transition: "filter 0.2s ease, transform 0.14s ease, box-shadow 0.2s ease",
  },

  /** Same blue as saveBtn, larger — task + whole-project instructor actions */
  instructorFeedbackPrimaryBtn: {
    background: "linear-gradient(145deg, #1d4ed8, #3b82f6)",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "14px 28px",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 700,
    minHeight: 50,
    boxShadow: "0 6px 20px rgba(59, 130, 246, 0.35)",
    transition: "filter 0.2s ease, transform 0.14s ease, box-shadow 0.2s ease",
    fontFamily: "inherit",
  },

  /** Same red as deleteBtn, larger — paired with instructorFeedbackPrimaryBtn */
  instructorFeedbackDangerBtn: {
    background: "#d62828",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "14px 28px",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 700,
    minHeight: 50,
    transition: "filter 0.2s ease, transform 0.14s ease",
    fontFamily: "inherit",
  },

  cancelBtn: {
    background: "rgba(255, 255, 255, 0.08)",
    color: "#e2e8f0",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: "11px 20px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    transition: "background 0.2s ease, border-color 0.2s ease, transform 0.14s ease",
  },

  deleteBtn: {
    background: "#d62828",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "11px 20px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    transition: "filter 0.2s ease, transform 0.14s ease",
  },

  editBtn: {
    background: "transparent",
    border: "1.5px solid rgba(94, 234, 212, 0.45)",
    borderRadius: 12,
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: 14,
    color: "#93c5fd",
    alignSelf: "flex-start",
    fontWeight: 700,
    transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.14s ease",
  },

  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },

  modalBox: {
    background:
      "linear-gradient(165deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.99) 100%)",
    color: "#e2e8f0",
    borderRadius: 16,
    padding: 24,
    minWidth: 340,
    maxHeight: "80vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    border: "1px solid rgba(59, 130, 246, 0.32)",
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.08) inset, 0 28px 70px rgba(0,0,0,0.55), 0 0 48px rgba(20,184,166,0.1)",
  },

  checkRow: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: 14,
  },

  sectionTitle: {
    margin: "0 0 20px",
    color: "#f1f5f9",
    fontSize: 20,
  },

  searchRow: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },

  resultsList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  resultRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(59, 130, 246, 0.18)",
    cursor: "pointer",
    background:
      "linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.28) 100%)",
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 22px rgba(0,0,0,0.22)",
    transition:
      "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, border-color 0.2s ease",
  },

  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#1d4ed8",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
  },

  instructorDetailCard: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  docList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 8,
  },

  docRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.18) 100%)",
    borderRadius: 8,
    border: "1px solid rgba(59, 130, 246, 0.14)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 16px rgba(0,0,0,0.18)",
    fontSize: 13,
  },

  mapHint: {
    fontSize: 13,
    color: "#94a3b8",
    margin: "4px 0 8px",
  },

  mapPickerBox: {
    height: 220,
    background:
      "linear-gradient(180deg, rgba(45,212,191,0.08) 0%, rgba(15,23,42,0.85) 100%)",
    borderRadius: 14,
    position: "relative",
    cursor: "pointer",
    marginTop: 6,
    border: "1.5px solid rgba(59, 130, 246, 0.22)",
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.06) inset, 0 10px 28px rgba(0,0,0,0.25)",
  },

  mapMarker: {
    position: "absolute",
    width: 18,
    height: 18,
    background: "#d62828",
    borderRadius: "50%",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    border: "3px solid #ffffff",
  },

  mapCoords: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
  },

  mapFrame: {
    border: "0",
    borderRadius: 14,
    marginTop: 14,
  },

  projectCard: {
    border: "1px solid rgba(59, 130, 246, 0.2)",
    padding: 18,
    marginTop: 12,
    borderRadius: 16,
    background:
      "linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.32) 100%)",
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.07) inset, 0 10px 28px rgba(0,0,0,0.28), 0 0 36px rgba(20,184,166,0.05)",
  },
};