export const dynamic = 'force-dynamic';

import RecordsList from "@/components/RecordsList/RecordsList";
import { prisma } from "@/lib/prisma";

import "./page.css";
import MainApp from "@/components/MainApp/MainApp";

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
  ])
  // const records = await prisma.records.findMany({});
  return (
    <div className="main-page">
      <MainApp categories={categories} records={records} />
    </div>
  );
}
