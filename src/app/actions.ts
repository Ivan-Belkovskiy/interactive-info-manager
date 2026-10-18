'use server';
import bcrypt from "bcryptjs";
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { _Record, User } from "@/types/data";


const SESSION_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

export async function loginUser(login: string, password: string) {

    if (!login || !password) {
        return { success: false, error: "Заполните все поля" };
    }

    try {
        const user = await prisma.users.findUnique({ where: { login } });
        if (!user) {
            return { success: false, error: "Неверный логин или пароль" };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return { success: false, error: "Неверный логин или пароль" };
        }

        const cookieStore = await cookies();
        cookieStore.set("user_session", user.login, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: SESSION_EXPIRATION,
            path: "/",
        });

    } catch (error) {
        console.error("Ошибка авторизации:", error);
        return { success: false, error: "Что-то пошло не так" };
    }

    redirect("/");
}

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete("user_session");
    redirect("/login");
}


export async function updateUserData(id: number, newData: Partial<User>) {
    try {
        const updated = await prisma.users.update({
            where: { id },
            data: {
                login: newData.login,
                keyPassword: newData.keyPassword
            }
        });

        return { success: true, updated };
    } catch (error) {
        console.error("Ошибка обновления данных пользователя:", error);
        return { success: false, error: "Ошибка сервера" };
    }
}



export async function createRecord({
    title,
    categoryId,
    content,
    isEncrypted
}: {
    title: string;
    categoryId: number | null;
    content: string;
    isEncrypted: boolean;
}) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        const newRecord = await prisma.records.create({
            data: {
                userId: user.id,
                categoryId: categoryId,
                title,
                content: content,
                isEncrypted
            }
        });

        revalidatePath('/');

        return { success: true, data: newRecord };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Не удалось сохранить" };
    }
}


export async function updateRecord({
    recordId,

    title,
    categoryId,
    content,
    isEncrypted
}: {
    recordId: number;

    title: string;
    categoryId: number | null;
    content: string;
    isEncrypted: boolean;
}) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        const newRecord = await prisma.records.update({
            where: {
                id: recordId,
            },
            data: {
                userId: user.id,
                categoryId: categoryId,
                title,
                content: content,
                isEncrypted
            }
        });

        revalidatePath('/');

        return { success: true, data: newRecord };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Не удалось сохранить" };
    }
}

export interface RecordDataToUpload {
    title: string;
    isEncrypted: boolean;
    content: string;
    categoryId: number | null;
}

export async function uploadManyRecords(records: RecordDataToUpload[]) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        const newRecords = await prisma.records.createMany({
            data: records.map(r => ({
                ...r,
                userId: user.id,
            }))
        });

        revalidatePath('/');

        return { success: true, data: newRecords };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Не удалось сохранить" };
    }
}

export async function deleteRecord(id: number) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        const newRecord = await prisma.records.delete({
            where: {
                id,
            },
        });

        revalidatePath('/');

        return { success: true, data: newRecord };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Не удалось сохранить" };
    }
}

export async function moveRecord(recordId: number, categoryId: number | null) {

    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        if (!recordId || !categoryId) return { success: false, error: "ID записи или категории не предоставлены" };

        const result = await prisma.$transaction(async (tx) => {
            const record = await tx.records.findUnique({
                where: {
                    id: recordId,
                    userId: user.id,
                }
            });

            if (!record) return { success: false, error: "Запись не найдена или принадлежит другому пользователю" };

            if (categoryId !== null) {
                const targetCategory = await tx.categories.findUnique({
                    where: {
                        id: categoryId,
                        userId: user.id,
                    }
                });

                if (!targetCategory) return { success: false, error: "Категория не найдена или принадлежит другому пользователю" };
            }



            return await tx.records.update({
                where: {
                    id: record.id,
                },
                data: {
                    categoryId,
                }
            });

        });

        revalidatePath("/");

        return { success: true, data: result };

    } catch (error: any) {
        return { success: false, error: error?.message || "Ошибка перемещения записи" };
    }
}

export async function createCategory(name: string, parentId: number | null = null) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        if (!name || name.trim() === "") {
            return { success: false, error: "Название категории не может быть пустым" };
        }

        const newCategory = await prisma.categories.create({
            data: {
                name: name.trim(),
                parentId: parentId,
                userId: user.id
            },
        });

        revalidatePath('/');
        return { success: true, data: newCategory };
    } catch (error: any) {
        return { success: false, error: error.message || "Не удалось создать категорию" };
    }
}


export async function deleteCategory(
    id: number,
    deleteWithRecords: boolean = false
) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        const result = await prisma.$transaction(
            async (tx) => {
                const categoryToDelete = await tx.categories.findUnique({
                    where: { id },
                    select: { id: true, parentId: true, userId: true },
                });

                if (!categoryToDelete) throw new Error("Категория не найдена");
                if (categoryToDelete.userId !== user.id) {
                    throw new Error("Нет доступа к этой категории");
                }

                const targetParentId = categoryToDelete.parentId;

                if (!deleteWithRecords) {
                    await tx.records.updateMany({
                        where: { categoryId: id },
                        data: { categoryId: targetParentId },
                    });

                    await tx.categories.updateMany({
                        where: { parentId: id },
                        data: { parentId: targetParentId },
                    });

                    const deleted = await tx.categories.delete({ where: { id } });

                    return {
                        deletedCategoryId: deleted.id,
                        deletedRecords: 0,
                        deletedCategories: 1,
                        mode: "moveUp" as const,
                    };
                }

                const subtreeIds: number[] = [id];
                let currentLevel: number[] = [id];

                while (currentLevel.length > 0) {
                    const children = await tx.categories.findMany({
                        where: {
                            parentId: { in: currentLevel },
                            userId: user.id,
                        },
                        select: { id: true },
                    });
                    const childIds = children.map((c) => c.id);
                    subtreeIds.push(...childIds);
                    currentLevel = childIds;
                }

                const recordsResult = await tx.records.deleteMany({
                    where: { categoryId: { in: subtreeIds } },
                });

                await tx.categories.delete({ where: { id } });

                return {
                    deletedCategoryId: id,
                    deletedRecords: recordsResult.count,
                    deletedCategories: subtreeIds.length,
                    mode: "withRecords" as const,
                };
            },
            {
                maxWait: 10_000,
                timeout: 30_000,
            }
        );

        revalidatePath("/");

        return { success: true, data: result };
    } catch (error: any) {
        console.error("Ошибка при удалении категории:", error);
        return {
            success: false,
            error: error.message || "Не удалось удалить категорию",
        };
    }
}

export async function moveCategory(currentId: number, targetId: number | null) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;
    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        if (currentId === targetId) {
            return { success: false, error: "Нельзя переместить категорию в саму себя" };
        }

        const result = await prisma.$transaction(
            async (tx) => {
                const current = await tx.categories.findUnique({
                    where: { id: currentId },
                    select: { id: true, parentId: true, userId: true },
                });
                if (!current || current.userId !== user.id) {
                    throw new Error("Текущая категория не найдена");
                }

                if (targetId !== null) {
                    const target = await tx.categories.findUnique({
                        where: { id: targetId },
                        select: { id: true, userId: true },
                    });
                    if (!target || target.userId !== user.id) {
                        throw new Error("Целевая категория не найдена");
                    }

                    let cursor: number | null = targetId;
                    while (cursor !== null) {
                        if (cursor === currentId) {
                            throw new Error(
                                "Нельзя переместить категорию внутрь текущей"
                            );
                        }
                        const parent: { parentId: number | null } | null =
                            await tx.categories.findUnique({
                                where: { id: cursor },
                                select: { parentId: true },
                            });
                        cursor = parent?.parentId ?? null;
                    }
                }

                return tx.categories.update({
                    where: { id: currentId },
                    data: { parentId: targetId },
                });
            },
            { maxWait: 10_000, timeout: 30_000 }
        );

        revalidatePath("/");
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Ошибка при перемещении категории:", error);
        return {
            success: false,
            error: error.message || "Не удалось переместить категорию",
        };
    }
}


export async function renameCategory(categoryId: number, newName: string) {

    const cookieStore = await cookies();
    const userLogin = cookieStore.get('user_session')?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {

        const user = await prisma.users.findUnique({
            where: { login: userLogin }
        });

        if (!user) return { success: false, error: "Пользователь не найден" };

        if (!categoryId || !newName) return { success: false, error: "ID или имя не предоставлены" };

        const res = await prisma.$transaction(async (tx) => {
            const category = await tx.categories.findUnique({
                where: {
                    id: categoryId,
                    userId: user.id,
                }
            });

            if (!category) return { success: false, error: "Категория не найдена или принадлежит другому пользователю" };

            return await tx.categories.update({
                where: {
                    id: category.id,
                },
                data: {
                    name: newName,
                }
            })
        });

        revalidatePath("/");

        return { success: true, data: res };

    } catch (error) {

    }
}


export async function replaceRecordsAndKeyPassword(records: _Record[], newKeyPassword: string) {
    if (!records || !newKeyPassword) return { success: false, error: "Новые данные не предоставлены!" };
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {

        const user = await prisma.users.findUnique({
            where: {
                login: userLogin,
            }
        });

        if (!user) return { success: false, error: "Пользователь не найден" };

        const res = await prisma.$transaction(async (p) => {
            const updatedUser = await p.users.update({
                where: { id: user.id },
                data: {
                    keyPassword: newKeyPassword,
                }
            });

            const deletedRecords = await p.records.deleteMany({
                where: {
                    userId: user.id,
                    isEncrypted: true,
                },
            });

            return await p.records.createMany({
                data: records,
            });

        });

        return { success: true, updatedRecords: res.count };

    } catch (error) {
        return { success: false, error };
    }
}


export async function updateBackupSettings(data: {
    backupEnabled: boolean;
    backupEmails: string[];
}) {
    try {
        const cookieStore = await cookies();
        const userLogin = cookieStore.get("user_session")?.value;
        if (!userLogin) return { success: false, error: "Не авторизован" };

        const user = await prisma.users.findUnique({
            where: { login: userLogin },
        });
        if (!user) return { success: false, error: "Пользователь не найден" };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const cleanEmails = Array.from(new Set(
            data.backupEmails
                .map((e) => e.trim().toLowerCase())
                .filter((e) => emailRegex.test(e))
        ));

        if (data.backupEnabled && cleanEmails.length === 0) {
            return { success: false, error: "Добавьте хотя бы один email" };
        }

        await prisma.users.update({
            where: { id: user.id },
            data: {
                backupEnabled: data.backupEnabled,
                backupEmails: cleanEmails,
            },
        });

        return { success: true };
    } catch (err) {
        console.error("updateBackupSettings error:", err);
        return { success: false, error: "Ошибка сохранения" };
    }
}


export interface FolderUploadItem {
    title: string;
    content: string;
    isEncrypted: boolean;
    virtualPath: string;
}

export async function uploadRecordsWithFolders(
    items: FolderUploadItem[],
    rootCategoryId: number | null
) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;
    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        let validRoot: number | null = null;
        if (rootCategoryId !== null) {
            const rootCategory = await prisma.categories.findFirst({
                where: { id: rootCategoryId, userId: user.id },
                select: { id: true },
            });
            if (rootCategory) validRoot = rootCategory.id;
        }

        const result = await prisma.$transaction(async (tx) => {
            const allCategories = await tx.categories.findMany({
                where: { userId: user.id },
                select: { id: true, name: true, parentId: true },
            });

            const categoryKey = (parentId: number | null, name: string) =>
                `${parentId ?? "r"}:${name}`;

            const categoriesMap = new Map<string, number>();
            for (const c of allCategories) categoriesMap.set(categoryKey(c.parentId, c.name), c.id);

            const ensurePath = async (virtualPath: string): Promise<number | null> => {
                const segments = virtualPath.split("/").filter(Boolean);
                let currentParent: number | null = validRoot;

                for (const seg of segments) {
                    const k = categoryKey(currentParent, seg);
                    let cId = categoriesMap.get(k);
                    if (cId === undefined) {
                        const created = await tx.categories.create({
                            data: {
                                userId: user.id,
                                parentId: currentParent,
                                name: seg,
                            },
                        });
                        cId = created.id;
                        categoriesMap.set(k, cId);
                    }
                    currentParent = cId;
                }
                return currentParent;
            };

            const byCategory = new Map<number | null, FolderUploadItem[]>();

            for (const item of items) {
                const categoryId = item.virtualPath
                    ? await ensurePath(item.virtualPath)
                    : validRoot;
                const contents = byCategory.get(categoryId) ?? [];
                contents.push(item);
                byCategory.set(categoryId, contents);
            }

            let imported = 0;
            for (const [categoryId, contents] of byCategory) {
                const res = await tx.records.createMany({
                    data: contents.map((it) => ({
                        userId: user.id,
                        categoryId: categoryId,
                        title: it.title,
                        content: it.content,
                        isEncrypted: it.isEncrypted,
                    })),
                });
                imported += res.count;
            }

            return { imported, categoriesCreated: categoriesMap.size - allCategories.length };
        }, {
            maxWait: 10000,
            timeout: 30000,
        });

        revalidatePath("/");
        return { success: true, imported: result.imported };
    } catch (error) {
        console.error("uploadRecordsWithFolders error:", error);
        return { success: false, error: "Не удалось сохранить данные" };
    }
}