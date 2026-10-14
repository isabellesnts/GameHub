import { db } from "../database/db";
import type { CreateProductDTO } from "../../src/dto/CreateProductDTO";
import type { Product } from "../../src/model/Product";

export interface ProductFilters {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function normalizeProductSort(sort?: string): "name" | "price" {
  return sort === "price" ? "price" : "name";
}

export function buildProductQuery(filters: ProductFilters = {}) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const search = filters.search?.trim();

  if (search) {
    values.push(`%${search}%`);
    const parameter = `$${values.length}`;
    conditions.push(`(name ILIKE ${parameter} OR description ILIKE ${parameter})`);
  }

  if (filters.category) {
    values.push(filters.category);
    conditions.push(`category = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = normalizeProductSort(filters.sort) === "price" ? "price ASC" : "name ASC";

  return { where, values, orderBy };
}

function normalizePage(value: number | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function normalizeLimit(value: number | undefined, fallback: number, max = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    category: String(row.category),
    price: Number(row.price),
    stock: Number(row.stock)
  };
}

export class ProductRepository {
  async findPage(filters: ProductFilters = {}): Promise<ProductListResult> {
    const page = normalizePage(filters.page, 1);
    const limit = normalizeLimit(filters.limit, 24, 50);
    const offset = (page - 1) * limit;
    const { where, values, orderBy } = buildProductQuery(filters);

    const totalSql = `SELECT COUNT(*) AS total FROM products ${where}`;
    const totalResult = await db.query<{ total: string }>(totalSql, values);
    const total = Number(totalResult.rows[0]?.total ?? 0);

    const itemsSql = `SELECT id, name, description, category, price, stock
      FROM products ${where}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const result = await db.query(itemsSql, [...values, limit, offset]);

    return {
      items: result.rows.map(mapProduct),
      total,
      page,
      limit,
      totalPages: total === 0 ? 1 : Math.ceil(total / limit)
    };
  }

  async findAll(filters: ProductFilters = {}): Promise<Product[]> {
    const { where, values, orderBy } = buildProductQuery(filters);
    const sql = `SELECT id, name, description, category, price, stock FROM products ${where} ORDER BY ${orderBy}`;
    const result = await db.query(sql, values);
    return result.rows.map(mapProduct);
  }

  async create(input: CreateProductDTO): Promise<Product> {
    const result = await db.query(
      `INSERT INTO products (name, description, category, price, stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, category, price, stock`,
      [input.name, input.description, input.category, input.price, input.stock]
    );
    return mapProduct(result.rows[0]);
  }

  async delete(id: number): Promise<void> {
    await db.query("DELETE FROM products WHERE id = $1", [id]);
  }

  async getDashboard() {
    const startedAt = performance.now();
    const result = await db.query(
      `SELECT
         COUNT(*) AS "totalProducts",
         COUNT(*) FILTER (WHERE stock <= 5) AS "lowStock",
         COALESCE(SUM(price * stock), 0) AS "inventoryValue",
         COUNT(DISTINCT category) AS "categories"
       FROM products`
    );
    const row = result.rows[0] ?? {};
    console.info(`[SQL OTIMIZADO] dashboard: 1 consulta em ${(performance.now() - startedAt).toFixed(2)} ms`);

    return {
      totalProducts: Number(row.totalProducts ?? 0),
      lowStock: Number(row.lowStock ?? 0),
      inventoryValue: Number(row.inventoryValue ?? 0),
      categories: Number(row.categories ?? 0)
    };
  }
}
