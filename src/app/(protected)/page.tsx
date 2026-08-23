export const dynamic = 'force-dynamic';

import RecordsList from "@/components/RecordsList/RecordsList";
import { prisma } from "@/lib/prisma";

import "./page.css";
import MainApp from "@/components/MainApp/MainApp";
import { AppContextProvider } from "@/context/AppContext";
import AppNavigation from "@/components/AppNavigation/AppNavigation";
import MainPage from "@/components/MainPage/MainPage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
    const [
        categories,
        records
    ] = await Promise.all([
        await prisma.categories.findMany({}),
        await prisma.records.findMany({
            orderBy: {
                title: 'asc',
            }
        })
    ]);

    const userLogin = (await cookies()).get('user_session');
    // return (
    //   <h1>{userLogin?.name}</h1>
    // )
    if (!userLogin?.value) return redirect('/login');

    const userData = await prisma.users.findUnique({
        where: {
            login: userLogin.value
        }
    });

    if (!userData) return (
        <div className="settings-page">
            <div className="settings-page__error">Пользователь не найден!</div>
        </div>
    );
    // const records = await prisma.records.findMany({});
    return (
        <AppContextProvider>
            <MainPage {...{ categories, records, userData }} />
        </AppContextProvider>
    );
}


// 'use client';

// import "./page.css";

// interface AppelGameInfo {
//     title: string;
//     year: number;
//     developedBy: string;
// }

// const APPEL_DATA: AppelGameInfo[] = [
//     {
//         title: "Appel v1.4",
//         developedBy: "griffpatch",
//         year: 2020,
//     },
//     {
//         title: "Appel (210+ levels)",
//         developedBy: "VilkiElense",
//         year: 2021,
//     },
//     {
//         title: "Appel: 5 Потерянных Микро Менеджеров",
//         developedBy: "VilkiElense",
//         year: 2024,
//     },
//     {
//         title: "Appel: Новогодние Приключения Краснуши",
//         developedBy: "VilkiElense",
//         year: 2025,
//     }
// ];

// export default function Home_Page() {
//     return (
//         <div className="home-page">
//             <h1 className="main-title">Все игры Appel</h1>
//             <div className="home-page__content">
//                 <div className="search-input-container">
//                     <input type="text" className="home-page__input" />
//                     <button className="home-page__button search-button">Найти</button>
//                 </div>
//                 <div className="appel-games-list">
//                     {APPEL_DATA.map(info => (
//                         <div className="appel-game-block">
//                             <div className="appel-game-block__left">
//                                 <span className="appel-game-block__title">{info.title}</span>
//                             </div>
//                             <div className="appel-game-block__right">
//                                 <span className="appel-game-block__year">Создана: <b>{info.year}</b> </span>
//                                 <span className="appel-game-block__developedBy">Разработчик: <b>{info.developedBy}</b> </span>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     )
// }