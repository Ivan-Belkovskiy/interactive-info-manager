import { Prisma } from "@prisma/client";

export type _Record = Prisma.recordsGetPayload<{}>;

export type Category = Prisma.categoriesGetPayload<{}>;

export type User = Prisma.usersGetPayload<{}>;



export type _MouseEvent = MouseEvent;