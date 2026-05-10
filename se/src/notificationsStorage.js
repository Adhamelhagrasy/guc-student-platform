// notificationsStorage.js

export const NOTIFICATIONS_KEY = "notifications";
export const NOTIFICATIONS_ENABLED_KEY = "notificationsEnabled";

/**
 * Read notifications from localStorage
 */
export function readNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((n, index) => ({
      id: n.id || `n-${index}`,
      text: n.text || "",
      read: Boolean(n.read),
      userEmail: n.userEmail || null,
      date: n.date || "",
    }));
  } catch {
    return [];
  }
}

/**
 * Write notifications + notify UI
 */
export function writeNotifications(list) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("guc-notifications-updated"));
}

/**
 * ✅ Add notification (USER-SPECIFIC ONLY)
 */
export function appendNotification({ text, userEmail }) {
  // Notifications OFF → do nothing
  if (localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "false") return;

  // ❌ Block global notifications (IMPORTANT FIX)
  if (!userEmail) {
    console.warn("Blocked notification (no userEmail):", text);
    return;
  }

  const list = readNotifications();

  list.push({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    text: String(text),
    read: false,
    userEmail: userEmail,
    date: new Date().toISOString(),
  });

  writeNotifications(list);
}

/**
 * Mark one notification read/unread
 */
export function setNotificationRead(id, read) {
  const list = readNotifications();

  const updated = list.map((n) =>
    n.id === id ? { ...n, read } : n
  );

  writeNotifications(updated);
}

/**
 * Mark all notifications as read (ONLY for current user)
 */
export function markAllNotificationsRead(currentUserEmail) {
  const list = readNotifications();

  const updated = list.map((n) =>
    n.userEmail === currentUserEmail
      ? { ...n, read: true }
      : n
  );

  writeNotifications(updated);
}