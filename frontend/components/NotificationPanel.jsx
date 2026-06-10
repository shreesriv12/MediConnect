import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    const token = localStorage.getItem("doctorAccessToken") || localStorage.getItem("clientAccessToken");
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/notifications`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load notifications");
      }

      setNotifications(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("doctorAccessToken") || localStorage.getItem("clientAccessToken");
    if (!token) return;

    await fetch(`${API_URL}/notifications/read-all`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  };

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">
            {unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "No unread updates"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchNotifications}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!unreadCount}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">Loading notifications...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <div
                key={notification._id}
                className={`rounded-lg border p-3 ${
                  notification.read
                    ? "border-slate-200 bg-slate-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
};

export default NotificationPanel;
