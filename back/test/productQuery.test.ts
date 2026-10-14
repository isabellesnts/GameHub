import assert from "node:assert/strict";
import test from "node:test";

import { buildProductQuery, normalizeProductSort } from "../infra/repositories/ProductRepository";

test("produto usa filtro de categoria no campo correto e ordena por preço", () => {
  const query = buildProductQuery({
    search: "console",
    category: "  Consoles  ",
    sort: "price"
  });

  assert.equal(query.orderBy, "price ASC");
  assert.ok(query.where.includes("LOWER(category) = LOWER($2)"));
  assert.ok(query.where.includes("LOWER(name) ILIKE LOWER($1)"));
  assert.deepEqual(query.values, ["%console%", "Consoles"]);
});

test("ordenação por preço mais alto e filtro de estoque baixo são suportados", () => {
  const query = buildProductQuery({
    sort: "price-desc",
    lowStockOnly: true
  });

  assert.equal(query.orderBy, "price DESC");
  assert.ok(query.where.includes("stock <= 5"));
});

test("sort inválido cai para ordem por nome", () => {
  assert.equal(normalizeProductSort("qualquer"), "name");
  assert.equal(normalizeProductSort("price"), "price");
  assert.equal(normalizeProductSort("stock"), "stock");
});
