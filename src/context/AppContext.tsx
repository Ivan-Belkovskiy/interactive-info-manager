'use client';

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from "react";

interface AppContextType {
    currentUrl: string;
    setCurrentUrl: (data: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: ReactNode }) {
    const [currentUrl, setCurrentUrl] = useState('/');
    return (
        <AppContext.Provider value={{
            currentUrl,
            setCurrentUrl
        }}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within AppContextProvider");
    }
    return context;
}