'use client';

import { AppContextProvider, useAppContext } from "@/context/AppContext"
import MainApp from "../MainApp/MainApp"
import AppNavigation from "../AppNavigation/AppNavigation"
import { _Record, Category, User } from "@/types/data"
import { useState } from "react";

export default function MainPage({ categories, records, userData }: { categories: Category[]; records: _Record[]; userData: User }) {
    const [currentUrl, setCurrentUrl] = useState('/');

    return (
        // <AppContextProvider>
        <>
            <AppNavigation currentUrl={currentUrl} setCurrentUrl={setCurrentUrl} />
            <div className="main-page">
                {(currentUrl === '/settings') ? (
                    <MainApp userData={userData} action={"user_settings"} setCurrentUrl={setCurrentUrl} />
                ) : (
                    <MainApp categories={categories} records={records} action={"main_app"} setCurrentUrl={setCurrentUrl} />
                )}
            </div>
        </>
        /* </AppContextProvider> */
    );
}