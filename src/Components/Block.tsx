import React from "react";
import type { CSSProperties } from "react";

interface BlockProps {
    onClick: () => void;
    style?: CSSProperties;
    children: React.ReactNode;
    className?: string;
    hoverScale?: number;
}

const Block: React.FC<BlockProps> = ({
    onClick,
    style = {},
    children,
    className = "block",
    hoverScale = 1.05
}) => {
    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = `scale(${hoverScale})`;
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'scale(1)';
    };

    return (
        <div
            className={className}
            style={{
                cursor: "pointer",
                transition: 'all 0.2s ease-in-out',
                transform: 'scale(1)',
                ...style
            }}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </div>
    );
};

export default Block;
