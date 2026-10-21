import { Request, Response } from "express";
import { success } from "../../common/response";
import { asyncHandler } from "../../common/async-handler";
import {
  createProductSchema, listProductsSchema, productIdSchema, updateProductSchema
} from "./products.schema";
import * as service from "./products.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listProductsSchema.parse(req.query);
  const result = await service.listProducts(query);
  return success(res, result.data, "Productos obtenidos correctamente", 200, result.meta);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = productIdSchema.parse(req.params);
  return success(res, await service.getProduct(id), "Producto obtenido correctamente");
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createProductSchema.parse(req.body);
  return success(res, await service.createProduct(input), "Producto creado correctamente", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id } = productIdSchema.parse(req.params);
  const input = updateProductSchema.parse(req.body);
  return success(res, await service.updateProduct(id, input), "Producto actualizado correctamente");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id } = productIdSchema.parse(req.params);
  await service.deactivateProduct(id);
  return res.status(204).send();
});
