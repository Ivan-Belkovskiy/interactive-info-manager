import { Prisma } from "@prisma/client";

export type _Record = Prisma.recordsGetPayload<{}>;

export type Category = Prisma.categoriesGetPayload<{}>;