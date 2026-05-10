import { useEffect, useState } from "react";
import {
  NOTIFICATIONS_ENABLED_KEY,
  markAllNotificationsRead,
  readNotifications,
  setNotificationRead,
} from "./notificationsStorage";
import "./portal-dashboard.css";

const NOTIFICATION_DEMOS = [
  "Spring exam schedule posted — check the portal calendar.",
  "Career fair registration opens this Thursday.",
  "New digital library resources are available on the intranet.",
];

export default function NotificationBell({ user }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [items, setItems] = useState(() => readNotifications());
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== "false"
  );

  useEffect(() => {
    function sync() {
      setItems(readNotifications());
    }

    window.addEventListener("guc-notifications-updated", sync);
    window.addEventListener("notificationsUpdated", sync);

    return () => {
      window.removeEventListener("guc-notifications-updated", sync);
      window.removeEventListener("notificationsUpdated", sync);
    };
  }, []);

  useEffect(() => {
    if (!panelOpen) return;

    function onKeyDown(e) {
      if (e.key === "Escape") setPanelOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panelOpen]);

  function openPanel() {
    setItems(readNotifications());
    setPanelOpen(true);
  }

  function refreshFromStorage() {
    setItems(readNotifications());
  }

  function toggleAlertsEnabled() {
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, next ? "true" : "false");
  }

  const myItems = user?.email
    ? items.filter((n) => n.userEmail === user.email)
    : [];

  const storedReversed = [...myItems].reverse();

  const rows =
    storedReversed.length > 0
      ? storedReversed.map((n) => ({
          key: n.id,
          id: n.id,
          text: n.text,
          read: n.read,
          variant: "real",
        }))
      : NOTIFICATION_DEMOS.map((text, index) => ({
          key: `demo-${index}`,
          id: null,
          text,
          read: true,
          variant: "demo",
        }));

  const unreadCount = myItems.filter((n) => !n.read).length;

  function itemClassNames(row) {
    return [
      "pd-notify-panel-item",
      row.variant === "demo" ? "pd-notify-panel-item--demo" : "",
      row.variant === "real" && !row.read ? "pd-notify-panel-item--unread" : "",
      row.variant === "real" && row.read ? "pd-notify-panel-item--read" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }


  return (
    <div className="pd-notify-anchor">
      <button
        type="button"
        className={alertsEnabled ? "pd-notify-bell" : "pd-notify-bell pd-notify-bell--muted"}
        aria-label={alertsEnabled ? "Notifications" : "Notifications muted"}
        aria-expanded={panelOpen}
        aria-haspopup="true"
        onClick={() => (panelOpen ? setPanelOpen(false) : openPanel())}
      >
        <svg
          className="pd-notify-bell-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          {!alertsEnabled && <path d="M4 4l16 16" className="pd-notify-bell-slash" />}
        </svg>

        {alertsEnabled && unreadCount > 0 && (
          <span className="pd-notify-badge" aria-hidden>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <>
          <div
            className="pd-notify-backdrop"
            role="presentation"
            onClick={() => setPanelOpen(false)}
          />

          <div
            className="pd-notify-panel"
            role="dialog"
            aria-label="Notification list"
          >
            <div className="pd-notify-panel-head">
              <div className="pd-notify-panel-head-text">
                <span className="pd-notify-panel-title">Notifications</span>

                {unreadCount > 0 ? (
                  <span className="pd-notify-panel-sub">
                    {unreadCount} unread
                  </span>
                ) : storedReversed.length > 0 ? (
                  <span className="pd-notify-panel-sub pd-notify-panel-sub--muted">
                    All caught up
                  </span>
                ) : (
                  <span className="pd-notify-panel-sub pd-notify-panel-sub--muted">
                    Portal updates & alerts
                  </span>
                )}
              </div>

              <button
                type="button"
                className="pd-notify-panel-close"
                aria-label="Close notifications"
                onClick={() => setPanelOpen(false)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ul className="pd-notify-panel-list">
              {rows.map((row) => {
                const body = (
                  <div className="pd-notify-panel-item-inner">
                    <div className="pd-notify-panel-item-top">
                      <span
                        className={[
                          "pd-notify-status-dot",
                          row.variant === "real" && !row.read
                            ? "pd-notify-status-dot--unread"
                            : "",
                          row.variant === "real" && row.read
                            ? "pd-notify-status-dot--read"
                            : "",
                          row.variant === "demo"
                            ? "pd-notify-status-dot--demo"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-hidden
                      />

                      <span className="pd-notify-panel-item-text">
                        {row.text}
                      </span>

                      {row.variant === "demo" && (
                        <span className="pd-notify-sample-pill">Sample</span>
                      )}
                    </div>
                  </div>
                );

                return (
                  <li key={row.key} className="pd-notify-panel-li">
                    {row.variant === "real" && row.id ? (
                      <button
                        type="button"
                        className={[
                          "pd-notify-row-btn",
                          itemClassNames(row),
                        ].join(" ")}
                        aria-pressed={!row.read}
                        aria-label={
                          row.read
                            ? `Read: ${row.text}. Click to mark unread.`
                            : `Unread: ${row.text}. Click to mark read.`
                        }
                        onClick={() => {
                          setNotificationRead(row.id, !row.read);
                          refreshFromStorage();
                        }}
                      >
                        {body}
                      </button>
                    ) : (
                      <div className={itemClassNames(row)}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>

            {storedReversed.length > 0 && (
              <div className="pd-notify-panel-toolbar">
                <button
                  type="button"
                  className="pd-notify-mark-all"
                  onClick={() => {
                    markAllNotificationsRead(user?.email);
                    refreshFromStorage();
                  }}
                >
                  Mark all as read
                </button>
              </div>
            )}

            <div className="pd-notify-panel-footer">
              <button
                type="button"
                role="switch"
                aria-checked={alertsEnabled}
                onClick={toggleAlertsEnabled}
                className="pd-notify-toggle-card"
              >
                <span className="pd-notify-toggle-copy">
                  <span className="pd-notify-toggle-title">
                    Notifications
                  </span>
                  <span className="pd-notify-toggle-sub">
                    {alertsEnabled
                      ? "On — new alerts will appear here."
                      : "Off — new alerts will be muted."}
                  </span>
                </span>

                <span className={alertsEnabled ? "pd-notify-switch pd-notify-switch--on" : "pd-notify-switch"} aria-hidden>
                  <span className="pd-notify-switch-knob" />
                </span>
              </button>

              {storedReversed.length === 0 && (
                <p className="pd-notify-panel-hint">
                  Sample messages above. Real alerts appear here when employers
                  update your applications.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
