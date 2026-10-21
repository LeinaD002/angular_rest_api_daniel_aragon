import { Router } from "express";
import * as controller from "./products.controller";

export const productsRouter = Router();

productsRouter.get("/", controller.list);
productsRouter.get("/:id", controller.getById);
productsRouter.post("/", controller.create);
productsRouter.patch("/:id", controller.update);
productsRouter.delete("/:id", controller.remove);
