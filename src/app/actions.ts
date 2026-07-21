'use server';
import bcrypt from "bcryptjs";
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";


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


export async function deleteCategory(id: number) {
    const cookieStore = await cookies();
    const userLogin = cookieStore.get("user_session")?.value;

    if (!userLogin) return { success: false, error: "Не авторизован" };

    try {
        const user = await prisma.users.findUnique({ where: { login: userLogin } });
        if (!user) return { success: false, error: "Пользователь не найден" };

        const deletedCategory = await prisma.$transaction(async (tx) => {
            const categoryToDelete = await tx.categories.findUnique({
                where: { id },
                select: { id: true, parentId: true, userId: true }
            });

            if (!categoryToDelete) {
                throw new Error("Категория не найдена");
            }

            if (categoryToDelete.userId !== user.id) {
                throw new Error("Нет доступа к этой категории");
            }

            const targetParentId = categoryToDelete.parentId;

            await tx.records.updateMany({
                where: { categoryId: id },
                data: { categoryId: targetParentId }
            });

            await tx.categories.updateMany({
                where: { parentId: id },
                data: { parentId: targetParentId }
            });

            return await tx.categories.delete({
                where: { id }
            });
        });

        revalidatePath('/');

        return { success: true, data: deletedCategory };
    } catch (error: any) {
        console.error("Ошибка при удалении категории:", error);
        return { 
            success: false, 
            error: error.message || "Не удалось удалить категорию" 
        };
    }
}