import React, { useState, useEffect } from "react";
import "./Alert.css";

interface AlertProps {
  text: string;
  duration?: number; // milliseconds, default 3000
}

export const Alert: React.FC<AlertProps> = ({ text, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div className="alert alert-success">
      <div className="alert-content">
        <span className="alert-icon">✓</span>
        <span className="alert-text">{text}</span>
      </div>
    </div>
  );
};