const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");

const env = fs
  .readFileSync(envPath, "utf8")
  .split(/\r?\n/)
  .reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return acc;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return acc;
    acc[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    return acc;
  }, {});

const baseUrl = (env.BITRIX_WEBHOOK_BASE_URL || "").replace(/\/?$/, "/");

const callBitrix = async (method, payload = {}) => {
  const response = await fetch(`${baseUrl}${method}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || response.statusText);
  }

  return data.result;
};

const normalizeCategory = (category) => ({
  id: category.id ?? category.ID,
  name: category.name ?? category.NAME,
});

const main = async () => {
  let categories;

  try {
    const result = await callBitrix("crm.category.list", { entityTypeId: 2 });
    categories = result.categories || result;
  } catch {
    const result = await callBitrix("crm.dealcategory.list");
    categories = Array.isArray(result) ? result : Object.values(result);
  }

  console.log(JSON.stringify(categories.map(normalizeCategory), null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
