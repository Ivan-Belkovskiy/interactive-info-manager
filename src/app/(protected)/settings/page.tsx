export const dynamic = 'force-dynamic';

import RecordsList from "@/components/RecordsList/RecordsList";
import { prisma } from "@/lib/prisma";

import "./page.css";
import MainApp from "@/components/MainApp/MainApp";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
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
    <div className="settings-page">
      <MainApp action="user_settings" userData={userData} />
    </div>
  );
}
