import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userLogin = cookieStore.get("user_session")?.value;

        if (!userLogin) {
            return new Response(
                JSON.stringify({ success: false, error: "Не авторизован" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const user = await prisma.users.findUnique({
            where: { login: userLogin },
        });

        if (!user) {
            return new Response(
                JSON.stringify({ success: false, error: "Пользователь не найден" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        const exportEncrypted = (req.nextUrl.searchParams.get('encrypted') === 'true') ? undefined : false;

        const allRecords = await prisma.records.findMany({
            where: { userId: user.id, isEncrypted: exportEncrypted },
        });

        const data = {
            "version": 1,
            "exportedAt": new Date().toISOString(),
            "records": allRecords
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(JSON.stringify(data, null, 2)));
                controller.close();
            },
        });

        const fileName = `export_${user.login}_${new Date().toISOString().slice(0, 10)}.json`;

        return new Response(stream, {
            headers: {
                "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    } catch (error) {
        console.error("Export error:", error);
        return new Response(
            JSON.stringify({ success: false, error: "Ошибка при экспорте данных" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}