import React, {useState} from "react";
import "./ToolTip.css"

type ToolTipProp = {
    text: string;               // Text tooltip displays
    delay?: number;             // Delay for the tooltip (in ms)
    children: React.ReactNode   // Nest elements inside the tooltip
};

export function ToolTip({
    text,
    delay = 400,
    children
} : ToolTipProp) {
    const [isVisible, setIsVisible] = useState(false); // State modification use built in react useState function, checks tool tip hovering
    return (
        <span className="tooltip-wrapper"
              onMouseEnter={() => setIsVisible(true)}
              onMouseLeave={() => setIsVisible(false)}
              style={{}}>
            {children}      
            {isVisible && (
                <span className="tooltip-block"
                    style={{}}>
                    {text}
                </span>
            )}
        </span>
    )
}