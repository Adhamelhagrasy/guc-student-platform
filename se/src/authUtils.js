export const LOGIN_ROLES = [
  "Student",
  "Administrator",
  "Employer",
  "Course Instructor",
];

export const REGISTER_ROLES = ["Student", "Course Instructor", "Employer"];

export const REGISTERED_USERS_STORAGE_KEY = "registeredUsers";

export function isEmailValidForRole(email, role) {
  const value = email.trim().toLowerCase();

  if (role === "Employer") {
    return value.includes("@") && value.includes(".");
  }

  return value.endsWith("@guc.edu.eg");
}

export function getEmailRule(role) {
  if (role === "Employer") {
    return "Employer can use GUC or company email.";
  }

  return "Email must end with @guc.edu.eg.";
}

export function loadRegisteredUsers() {
  try {
    const rawValue = localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

export function saveDocsToUserProfile(email, companyName, docs) {
  const profiles = JSON.parse(localStorage.getItem("userProfiles")) || {};

  profiles[email] = {
    ...(profiles[email] || {}),
    companyName,
    docs,
  };

  localStorage.setItem("userProfiles", JSON.stringify(profiles));
}
