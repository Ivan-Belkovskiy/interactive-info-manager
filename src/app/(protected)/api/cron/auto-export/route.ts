import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport(
    {
        host: process.env['SMTP_HOST'],
        port: Number(process.env['SMTP_PORT']),
        secure: true,
        auth: {
            user: process.env['SMTP_USER'],
            pass: process.env['SMTP_PASS'],
        },
    },
    {
        from: process.env['SMTP_USER'],
    },
);

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const users = await prisma.users.findMany({
            where: {
                backupEnabled: true,
                backupEmails: { isEmpty: false },
            },
            select: {
                id: true,
                login: true,
                backupEmails: true,
                backupLastSentAt: true,
            },
        });

        const results: { login: string; sent: boolean; error?: string }[] = [];

        for (const user of users) {
            try {
                const records = await prisma.records.findMany({
                    where: { userId: user.id },
                    orderBy: { id: "asc" },
                });

                if (records.length === 0) {
                    results.push({ login: user.login, sent: false, error: "нет записей" });
                    continue;
                }

                const payload = {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    records,
                };

                const jsonBuffer = Buffer.from(JSON.stringify(payload, null, 2), "utf-8");
                const filename = `backup_${user.login}_${new Date().toISOString().slice(0, 10)}.json`;

                try {
                    const info = await transporter.sendMail({
                        from: `"Interactive Info Manager" <${process.env['SMTP_USER']}>`,
                        to: user.backupEmails.join(", "),
                        subject: `🕒 Авто-экспорт записей (${records.length} шт.)`,
                        html: `
                    <h1>Interactive Info Manager</h1>
        <p>Это автоматический экспорт записей.</p>
        <p>Записей в файле: <b>${records.length}</b></p>
    `,
                        attachments: [{ filename, content: jsonBuffer }],
                    });

                    if (info.rejected && info.rejected.length > 0) {
                        results.push({
                            login: user.login,
                            sent: false,
                            error: `Отклонены адреса: ${info.rejected.join(", ")}`,
                        });
                    } else {
                        results.push({ login: user.login, sent: true });
                        await prisma.users.update({
                            where: { id: user.id },
                            data: { backupLastSentAt: new Date() },
                        });
                    }
                } catch (err) {
                    console.error(`Backup error for ${user.login}:`, err);
                    results.push({
                        login: user.login,
                        sent: false,
                        error: err instanceof Error ? err.message : "unknown error",
                    });
                }
            } catch (err) {
                console.error(`Backup error for ${user.login}:`, err);
                results.push({
                    login: user.login,
                    sent: false,
                    error: err instanceof Error ? err.message : "unknown error",
                });
            }
        }

        return Response.json({
            success: true,
            processed: users.length,
            results,
        });
    } catch (err) {
        console.error("Cron auto-export error:", err);
        return Response.json(
            { success: false, error: "Внутренняя ошибка" },
            { status: 500 }
        );
    }
}