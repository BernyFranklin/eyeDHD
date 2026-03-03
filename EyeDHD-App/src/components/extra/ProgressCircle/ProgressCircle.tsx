import React from "react"
import "./ProgressCircle.css"

type ProgressCircleProp = {
    value: number;       // Progress value
    size?: number;       // Size of the circle     
    thickness?: number;  // Thickness of the circle
    min?: number;        // Min value of progress (defaults to 0)
    max?: number;        // Max value of profress (defaults to 1)
};

export function ProgressCircle({
    value,  // 
    size = 120, 
    thickness = 4, 
    min = 0, 
    max = 1
} : ProgressCircleProp) {

    const radius = (size-thickness)/2;
    const circumference = 2 * Math.PI * radius;

    // converts min, max, and the value into a 0-100 value
    const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

    // how much we "hide" of the circle for progress
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <svg width={size} height={size}>
            {/* Background circle - gray, always full */}
            <circle 
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e0e0e0"        // Light gray
                strokeWidth={thickness}
            />
            
            {/* Progress circle - blue, partially shown based on value */}
            <circle 
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="blue"
                strokeWidth={thickness}
                strokeDasharray={circumference}  // Makes one long dash
                strokeDashoffset={offset}        // Shifts it to show progress
                strokeLinecap="round"            // Rounded ends
                transform={`rotate(-90 ${size / 2} ${size / 2})`}  // Start at top
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}  // Smooth animation
            />
        </svg>
    );
}