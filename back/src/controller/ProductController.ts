import type { Request, Response } from "express";
import { createProductSchema } from "../dto/CreateProductDTO";
import { ProductService } from "../../infra/services/ProductService";

export class ProductController {
  constructor(private readonly service = new ProductService()) {}

  list = async (request: Request, response: Response) => {
    const page = Number(request.query.page ?? 1);
    const limit = Number(request.query.limit ?? 24);
    const lowStockOnly = request.query.lowStockOnly === "true" || request.query.lowStockOnly === "1";

    const products = await this.service.list({
      search: String(request.query.search ?? ""),
      category: String(request.query.category ?? ""),
      sort: String(request.query.sort ?? "name"),
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 24,
      lowStockOnly
    });
    response.json(products);
  };

  create = async (request: Request, response: Response) => {
    const parsed = createProductSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        message: "Dados inválidos.",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    const product = await this.service.create(parsed.data);
    response.status(201).json(product);
  };

  remove = async (request: Request, response: Response) => {
    await this.service.remove(Number(request.params.id));
    response.json({ message: "Produto excluído com sucesso." });
  };

  dashboard = async (_request: Request, response: Response) => {
    response.json(await this.service.dashboard());
  };
}
