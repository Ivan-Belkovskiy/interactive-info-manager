'use client';

import { usePathname, useRouter } from "next/navigation";
import "./AppNavigation.css";
import { useAppContext } from "@/context/AppContext";

type AppNavigationElement = {
    type: "app-logo";
} | {
    type: "button";
    isLink: true;
    linkUrl: string;
    textContent: string;
} | {
    type: "button";
    isLink?: false;
    textContent: string;
    onClick?: () => void;
}

interface AppNavigationMain {
    left?: AppNavigationElement[];
    middle?: AppNavigationElement[];
    right?: AppNavigationElement[];
}

const NAVIGATION_ELEMENTS: AppNavigationMain = {
    left: [
        {
            type: "app-logo",
        }
    ],
    middle: [
        {
            type: "button",
            isLink: true,
            linkUrl: '/',
            textContent: 'Мои записи',
        },
        {
            type: "button",
            isLink: true,
            linkUrl: '/settings',
            textContent: 'Настройки аккаунта',
        },
    ]
}

export default function AppNavigation({ currentUrl, setCurrentUrl }: { currentUrl: string; setCurrentUrl: (data: string) => void; }) {

    // const { currentUrl, setCurrentUrl } = useAppContext();

    // const {}

    // const router = useRouter();

    const renderElements = (section: "left" | "middle" | "right") => {
        return NAVIGATION_ELEMENTS[section]?.map((el, idx) => {
            if (el.type === 'app-logo') return (
                <h1 className="app-navigation-element app-logo" key={idx}>Interactive Info Manager</h1>
            );

            if (el.type === 'button') return (
                <button
                    key={idx}
                    className={(el.isLink) ? `app-navigation-element app-navigation__button ${(el.linkUrl === currentUrl) ? 'current-url' : ''}` : "app-navigation-element app-navigation__button"}
                    onClick={() => {
                        if (el.isLink && el.linkUrl) setCurrentUrl(el.linkUrl);
                        else if (!el.isLink) el.onClick?.();
                    }}
                >{el.textContent}</button>
            )
        })
    }

    return (
        <div className="app-navigation">
            <div className="app-navigation__left">
                {renderElements('left')}
                {/* <h1 className="app-navigation-element app-logo">Interactive Info Manager</h1> */}
            </div>
            <div className="app-navigation__center">
                {renderElements('middle')}
                {/* <button className="app-navigation-element app-navigation__button">Мои записи</button>
                <button className="app-navigation-element app-navigation__button">Настройки аккаунта</button> */}
            </div>
            <div className="app-navigation__right">
                {renderElements('right')}
                {/* <button className="app-navigation-element app-navigation__button">Настройки аккаунта</button> */}
            </div>
        </div>
    )
}