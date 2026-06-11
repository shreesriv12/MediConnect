import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const NotificationBell = ({ theme = "light" }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef(null);

  const getToken = () => localStorage.getItem("doctorAccessToken") || localStorage.getItem("clientAccessToken");

  const fetchNotifications = async () => {
    const token = getToken();
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
    const token = getToken();
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const surfaceClass = theme === "dark"
    ? "bg-gray-800 text-white border-gray-700"
    : "bg-white text-gray-900 border-gray-200";

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative rounded-full p-2 ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
        aria-label="Open notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      {open && (
        <div className={`fixed right-3 left-3 top-16 z-50 rounded-lg border shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80 ${surfaceClass}`}>
          <div className={`border-b p-4 ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Notifications</h2>
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                  {unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "No unread updates"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={fetchNotifications}
                className={`rounded-md border px-3 py-1.5 text-sm ${theme === "dark" ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"}`}
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={markAllRead}
                disabled={!unreadCount}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-3">
            {loading && <p className="p-3 text-sm text-gray-500">Loading notifications...</p>}
            {error && <p className="p-3 text-sm text-red-600">{error}</p>}
            {!loading && !error && notifications.length === 0 && (
              <p className={`p-3 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>No notifications yet.</p>
            )}
            {!loading && !error && notifications.slice(0, 8).map((notification) => (
              <div
                key={notification._id}
                className={`mb-2 rounded-lg border p-3 ${
                  notification.read
                    ? theme === "dark" ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"
                    : theme === "dark" ? "border-blue-800 bg-blue-950" : "border-blue-200 bg-blue-50"
                }`}
              >
                <p className="font-medium">{notification.title}</p>
                <p className={`mt-1 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  {notification.message}
                </p>
                <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
