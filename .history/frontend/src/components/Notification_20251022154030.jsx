import React, { useEffect } from "react";

export default function Notification({ notification, onClose }) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!notification) return null;
  return <div className={`notification ${notification.type}`}>{notification.message}</div>;
}
