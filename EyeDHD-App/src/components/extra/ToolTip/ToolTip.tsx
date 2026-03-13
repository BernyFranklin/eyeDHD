import React from "react";
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
    return (
        <span className="tooltip-wrapper"
              style={{}}>
            {children}
            <span className="tooltip-block"
                  style={{}}/>
        </span>
    )
}