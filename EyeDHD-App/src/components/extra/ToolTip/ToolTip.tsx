import React, {useRef, useState} from "react";

import "./ToolTip.css"

type ToolTipProp = {
    text: string;               // Text tooltip displays
    delay?: number;             // Delay for the tooltip (in ms)
    children: React.ReactNode   // Nest elements inside the tooltip
    _style?: React.CSSProperties;
};

export function ToolTip({
    text,
    delay = 400,
    children,
    _style
} : ToolTipProp) {
    const [isVisible, setIsVisible] = useState(false); // State modification use built in react useState function, checks tool tip hovering
    const timerRef = useRef<number | null>(null);

    const handleMouseEnter = () => {
        timerRef.current = window.setTimeout(() => {
            setIsVisible(true);
        }, delay);
    }

    const handleMouseLeave = () => {
        // cancel pending show
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setIsVisible(false);
    };

    return (
        <span className="tooltip-wrapper"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}>
            {children}      
            {isVisible && (
                <span className="tooltip-block"
                    style={_style}>
                    {text}
                </span>
            )}
        </span>
    )
}