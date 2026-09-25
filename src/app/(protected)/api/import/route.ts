import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ
const MAX_RECORDS = 10_000;

const RecordSchema = z.object({
    id: z.number().int().optional(),
    title: z.string().min(1).max(500),
    content: z.string(),
    isEncrypted: z.boolean(),
    categoryId: z.number().int().nullable().optional(),
});

const ModeSchema = z.enum(["insert", "updateById", "replaceAll"]);

const BodySchema = z.object({
    version: z.number().int().optional(),
    exportedAt: z.string().optional(),
    records: z.array(RecordSchema).min(1).max(MAX_RECORDS),
    mode: ModeSchema.default("insert"),
});

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userLogin = cookieStore.get("user_session")?.value;
        if (!userLogin) {
            return Response.json(
                { success: false, error: "Не авторизован" },
                { status: 401 }
            );
        }

        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) {
            return Response.json(
                { success: false, error: "Пользователь не найден" },
                { status: 404 }
            );
        }

        const contentLength = Number(req.headers.get("content-length") ?? 0);
        if (contentLength > MAX_FILE_SIZE) {
            return Response.json(
                { success: false, error: "Файл слишком большой (максимум 5 МБ)" },
                { status: 413 }
            );
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return Response.json(
                { success: false, error: "Файл не является валидным JSON" },
                { status: 400 }
            );
        }

        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
            return Response.json(
                {
                    success: false,
                    error: "Некорректный формат файла",
                    details: parsed.error.issues
                        .slice(0, 5)
                        .map((i) => `${i.path.join(".")}: ${i.message}`),
                },
                { status: 400 }
            );
        }

        const { records, mode } = parsed.data;

        const userCategories = await prisma.categories.findMany({
            where: { userId: user.id },
            select: { id: true },
        });
        const validCategoryIds = new Set(userCategories.map((c) => c.id));

        const sanitize = (r: z.infer<typeof RecordSchema>) => ({
            userId: user.id,
            title: r.title,
            content: r.content,
            isEncrypted: r.isEncrypted,
            categoryId:
                r.categoryId != null && validCategoryIds.has(r.categoryId)
                    ? r.categoryId
                    : null,
        });

        if (mode === "replaceAll") {
            const result = await prisma.$transaction(async (tx) => {
                await tx.records.deleteMany({ where: { userId: user.id } });
                return tx.records.createMany({
                    data: records.map(sanitize),
                });
            });

            return Response.json({
                success: true,
                imported: result.count,
                updated: 0,
            });
        }

        if (mode === "updateById") {
            const userRecords = await prisma.records.findMany({
                where: { userId: user.id },
                select: { id: true },
            });
            const userRecordIds = new Set(userRecords.map((r) => r.id));

            const result = await prisma.$transaction(async (tx) => {
                let imported = 0;
                let updated = 0;

                for (const r of records) {
                    const data = sanitize(r);

                    if (r.id !== undefined && userRecordIds.has(r.id)) {
                        await tx.records.update({
                            where: { id: r.id },
                            data: {
                                title: data.title,
                                content: data.content,
                                isEncrypted: data.isEncrypted,
                                categoryId: data.categoryId,
                            },
                        });
                        updated++;
                    } else {
                        await tx.records.create({ data });
                        imported++;
                    }
                }

                return { imported, updated };
            });

            return Response.json({
                success: true,
                imported: result.imported,
                updated: result.updated,
            });
        }

        const created = await prisma.$transaction(
            records.map((r) => prisma.records.create({ data: sanitize(r) }))
        );

        return Response.json({
            success: true,
            imported: created.length,
            updated: 0,
        });
    } catch (err) {
        console.error("Import error:", err);
        return Response.json(
            { success: false, error: "Ошибка при импорте" },
            { status: 500 }
        );
    }
}