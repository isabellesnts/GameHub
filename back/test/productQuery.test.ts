import assert from "node:assert/strict";
import test from "node:test";

import { buildProductQuery, normalizeProductSort } from "../infra/repositories/ProductRepository";

test("produto usa filtro de categoria no campo correto e ordena por preço", () => {
  const query = buildProductQuery({
    search: "console",
    category: "Consoles",
    sort: "price"
  });

  assert.equal(query.orderBy, "price ASC");
  assert.ok(query.where.includes("category = $2"));
  assert.ok(query.where.includes("name ILIKE $1"));
  assert.deepEqual(query.values, ["%console%", "Consoles"]);
});

test("sort inválido cai para ordem por nome", () => {
  assert.equal(normalizeProductSort("qualquer"), "name");
  assert.equal(normalizeProductSort("price"), "price");
});
