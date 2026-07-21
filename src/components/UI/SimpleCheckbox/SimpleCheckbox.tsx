'use client';

import { useEffect, useRef, useState } from "react";
import "./SimpleCheckbox.css";

export default function SimpleCheckbox({ disabled, checked, onSelect }: { disabled?: boolean; checked?: boolean; onSelect?: (newVal: boolean) => void }) {
    const [isChecked, setChecked] = useState(checked || false);

    useEffect(() => setChecked(checked || false), [checked]);

    const handleSelect = () => {
        // setChecked(p => !p);
        onSelect?.(!isChecked);
    }

    return (
        <div className="simple-checkbox__container">
            {/* <input type="checkbox" hidden checked  /> */}
            <button
                type="button"
                className={`simple-checkbox__checkbox ${isChecked ? 'checked' : ''}`}
                disabled={disabled}
                onClick={handleSelect}
            ></button>
        </div>
    )
}