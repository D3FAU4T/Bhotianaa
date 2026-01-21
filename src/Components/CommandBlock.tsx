import React from "react";
import Block from "./Block";

interface CommandBlockProps {
    value: number | string;
    label: string;
    onClick: () => void;
}

const CommandBlock: React.FC<CommandBlockProps> = ({ value, label, onClick }) => {
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
            <h1>{value}</h1>
            <p>{label}</p>
        </Block>
    );
};

export default CommandBlock;
