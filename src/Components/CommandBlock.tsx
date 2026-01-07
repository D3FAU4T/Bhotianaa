import React from "react";
import Block from "./Block";

interface CommandBlockProps {
    count: number;
    label: string;
    onClick: () => void;
}

const CommandBlock: React.FC<CommandBlockProps> = ({ count, label, onClick }) => {
    return (
        <Block
            onClick={onClick}
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-evenly",
                alignItems: "center"
            }}
        >
            <h1>{count}</h1>
            <p>{label}</p>
        </Block>
    );
};

export default CommandBlock;
