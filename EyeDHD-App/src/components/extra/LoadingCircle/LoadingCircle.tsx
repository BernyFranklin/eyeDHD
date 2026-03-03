import React from "react";
import "./LoadingCircle.css";

type LoadingCircleProps = {
  size?: number;        // diameter in px
  thickness?: number;   // border thickness
};

export function LoadingCircle({size = 40, thickness = 4}: LoadingCircleProps) {
  return (
    <div
      className="loading-circle"
      style={{
        width: size,
        height: size,
        borderWidth: thickness,
      }}
    />
  );
}