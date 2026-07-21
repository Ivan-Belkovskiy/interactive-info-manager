'use client';

import { useEffect, useRef, useState } from "react";
import "./TextEditor.css";

export interface TextEditorProps {
    className?: string;
    initialValue?: string;
    onChange?: (newValue: string) => void;
}

export default function TextEditor({ className, initialValue = "", onChange }: TextEditorProps) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            
            const textarea = inputRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const tabSpaces = "	";

            const newValue = value.substring(0, start) + tabSpaces + value.substring(end);
            
            setValue(newValue);
            onChange?.(newValue);

            setTimeout(() => {
                textarea.setSelectionRange(start + tabSpaces.length, start + tabSpaces.length);
                textarea.focus();
            }, 0);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setValue(val);
        onChange?.(val);
    };

    return (
        <textarea
            className={`text-editor__input ${className ?? ""}`}
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
        ></textarea>
    );
}