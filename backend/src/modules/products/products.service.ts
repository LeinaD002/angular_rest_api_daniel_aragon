import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../common/http-error";
import { z } from "zod";
import {
  createProductSchema, listProductsSchema, updateProductSchema
} from "./products.schema";

type ListQuery = z.infer<typeof listProductsSchema>;
type CreateProduct = z.infer<typeof createProductSchema>;
type UpdateProduct = z.infer<typeof updateProductSchema>;

export async function listProducts(query: ListQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(query.search ? {
      OR: [
        { name: { contains: query.search } },
        { sku: { contains: query.search } },
        { description: { contains: query.search } }
      ]
    } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive === "true" } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined ? {
      price: {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {})
      }
    } : {}),
    ...(query.minStock !== undefined || query.maxStock !== undefined ? {
      stock: {
        ...(query.minStock !== undefined ? { gte: query.minStock } : {}),
        ...(query.maxStock !== undefined ? { lte: query.maxStock } : {})
      }
    } : {}),
    ...(query.lowStock === "true" ? { stock: { lte: 0 } } : {})
  };

  // lowStock compara stock contra minStock: se consulta y filtra para mantener la regla clara.
  if (query.lowStock === "true") {
    delete where.stock;
  }

  const orderBy = { [query.sortBy]: query.sortOrder } as Prisma.ProductOrderByWithRelationInput;
  const skip = (query.page - 1) * query.limit;

  const [rows, totalItems] = await prisma.$transaction([
    prisma.product.findMany({
      where, orderBy, skip, take: query.limit,
      include: { category: { select: { id: true, name: true } } }
    }),
    prisma.product.count({ where })
  ]);

  const products = query.lowStock === "true"
    ? rows.filter((p) => p.stock <= p.minStock)
    : rows;

  // Para lowStock se filtra correctamente antes de paginar y contar.
  if (query.lowStock === "true") {
    const allLowStock = await prisma.product.findMany({
      where: { ...where },
      orderBy,
      include: { category: { select: { id: true, name: true } } }
    });
    const filtered = allLowStock.filter((p) => p.stock <= p.minStock);
    const paged = filtered.slice(skip, skip + query.limit);
    const totalPages = Math.ceil(filtered.length / query.limit);
    return {
      data: paged,
      meta: {
        page: query.page, limit: query.limit, totalItems: filtered.length, totalPages,
        hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1
      }
    };
  }

  const totalPages = Math.ceil(totalItems / query.limit);
  return {
    data: products,
    meta: {
      page: query.page, limit: query.limit, totalItems, totalPages,
      hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1
    }
  };
}

export async function getProduct(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true } } }
  });
  if (!product) throw new HttpError(404, "Producto no encontrado");
  return product;
}

export async function createProduct(input: CreateProduct) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new HttpError(400, "La categoría indicada no existe");
  if (!category.isActive) throw new HttpError(400, "La categoría está inactiva");

  return prisma.product.create({
    data: {
      ...input,
      price: new Prisma.Decimal(input.price),
      description: input.description ?? null
    },
    include: { category: { select: { id: true, name: true } } }
  });
}

export async function updateProduct(id: number, input: UpdateProduct) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Producto no encontrado");

  if (input.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new HttpError(400, "La categoría indicada no existe");
    if (!category.isActive) throw new HttpError(400, "La categoría está inactiva");
  }

  const data: Prisma.ProductUpdateInput = {
    ...(input.sku !== undefined ? { sku: input.sku } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
    ...(input.stock !== undefined ? { stock: input.stock } : {}),
    ...(input.minStock !== undefined ? { minStock: input.minStock } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.categoryId !== undefined ? { category: { connect: { id: input.categoryId } } } : {})
  };

  return prisma.product.update({
    where: { id }, data,
    include: { category: { select: { id: true, name: true } } }
  });
}

export async function deactivateProduct(id: number) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Producto no encontrado");
  if (!existing.isActive) return existing;
  return prisma.product.update({ where: { id }, data: { isActive: false } });
}
