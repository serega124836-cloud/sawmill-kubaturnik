const form = document.querySelector("#calc-form");
const inputs = {
  thickness: document.querySelector("#thickness"),
  width: document.querySelector("#width"),
  length: document.querySelector("#length"),
  quantity: document.querySelector("#quantity"),
  price: document.querySelector("#price"),
  waste: document.querySelector("#waste"),
};

const singleVolume = document.querySelector("#single-volume");
const lineVolume = document.querySelector("#line-volume");
const linePrice = document.querySelector("#line-price");
const itemsBody = document.querySelector("#items-body");
const clearList = document.querySelector("#clear-list");
const copyList = document.querySelector("#copy-list");
const copyStatus = document.querySelector("#copy-status");
const callbackModal = document.querySelector("#callback-modal");
const callbackForm = document.querySelector("#callback-form");
const dealStatus = document.querySelector("#deal-status");
const openCallbackButtons = document.querySelectorAll("[data-open-callback]");
const closeCallbackButtons = document.querySelectorAll("[data-close-callback]");

const summary = {
  lines: document.querySelector("#summary-lines"),
  pieces: document.querySelector("#summary-pieces"),
  raw: document.querySelector("#summary-raw"),
  volume: document.querySelector("#summary-volume"),
  price: document.querySelector("#summary-price"),
  metricVolume: document.querySelector("#metric-volume"),
  metricPieces: document.querySelector("#metric-pieces"),
  metricTotal: document.querySelector("#metric-total"),
};

let items = [];
let currentTotals = { lines: 0, pieces: 0, raw: 0, volume: 0, total: 0 };

const formatVolume = (value) => `${value.toFixed(3)} м3`;
const formatMoney = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const getNumber = (input) => {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
};

const calculateLine = () => {
  const thickness = getNumber(inputs.thickness);
  const width = getNumber(inputs.width);
  const length = getNumber(inputs.length);
  const quantity = Math.max(0, Math.floor(getNumber(inputs.quantity)));
  const price = getNumber(inputs.price);
  const waste = getNumber(inputs.waste);

  const single = (thickness / 1000) * (width / 1000) * length;
  const raw = single * quantity;
  const volume = raw * (1 + waste / 100);
  const total = volume * price;

  return { thickness, width, length, quantity, price, waste, single, raw, volume, total };
};

const buildCalculationText = () => {
  if (items.length === 0) {
    return "Кубатурник пока без позиций.";
  }

  const lines = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.thickness} x ${item.width} мм, ${item.length} м, ${item.quantity} шт — ${formatVolume(item.volume)}, ${formatMoney(item.total)}`
    )
    .join("\n");

  return [
    lines,
    "",
    `Позиций: ${currentTotals.lines}`,
    `Количество: ${currentTotals.pieces} шт`,
    `Чистый объем: ${formatVolume(currentTotals.raw)}`,
    `Объем с запасом: ${formatVolume(currentTotals.volume)}`,
    `Стоимость: ${formatMoney(currentTotals.total)}`,
  ].join("\n");
};

const updatePreview = () => {
  const line = calculateLine();
  singleVolume.textContent = formatVolume(line.single);
  lineVolume.textContent = formatVolume(line.volume);
  linePrice.textContent = formatMoney(line.total);
};

const renderItems = () => {
  if (items.length === 0) {
    itemsBody.innerHTML = '<tr class="empty-row"><td colspan="7">Добавьте первую позицию, чтобы увидеть ведомость.</td></tr>';
  } else {
    itemsBody.innerHTML = items
      .map(
        (item, index) => `
          <tr>
            <td>${item.thickness} x ${item.width} мм</td>
            <td>${item.length} м</td>
            <td>${item.quantity} шт</td>
            <td>${formatVolume(item.raw)}</td>
            <td>${formatVolume(item.volume)}</td>
            <td>${formatMoney(item.total)}</td>
            <td><button type="button" data-remove="${index}" aria-label="Удалить позицию">×</button></td>
          </tr>
        `
      )
      .join("");
  }

  const totals = items.reduce(
    (acc, item) => {
      acc.lines += 1;
      acc.pieces += item.quantity;
      acc.raw += item.raw;
      acc.volume += item.volume;
      acc.total += item.total;
      return acc;
    },
    { lines: 0, pieces: 0, raw: 0, volume: 0, total: 0 }
  );

  summary.lines.textContent = totals.lines;
  summary.pieces.textContent = `${totals.pieces} шт`;
  summary.raw.textContent = formatVolume(totals.raw);
  summary.volume.textContent = formatVolume(totals.volume);
  summary.price.textContent = formatMoney(totals.total);
  summary.metricVolume.textContent = formatVolume(totals.volume);
  summary.metricPieces.textContent = `${totals.pieces} шт`;
  summary.metricTotal.textContent = formatMoney(totals.total);
  currentTotals = totals;

  if (items.length === 0) {
    copyStatus.textContent = "Расчет появится здесь и в верхних показателях сайта.";
  }
};

form.addEventListener("input", updatePreview);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const line = calculateLine();

  if (line.thickness <= 0 || line.width <= 0 || line.length <= 0 || line.quantity <= 0) {
    return;
  }

  items = [...items, line];
  renderItems();
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const [thickness, width, length] = button.dataset.preset.split(",");
    inputs.thickness.value = thickness;
    inputs.width.value = width;
    inputs.length.value = length;
    updatePreview();
    document.querySelector("#kubaturnik").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

itemsBody.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove]");
  if (!removeButton) return;

  const index = Number(removeButton.dataset.remove);
  items = items.filter((_, itemIndex) => itemIndex !== index);
  renderItems();
});

clearList.addEventListener("click", () => {
  items = [];
  renderItems();
});

copyList.addEventListener("click", async () => {
  if (items.length === 0) {
    copyStatus.textContent = "Добавьте хотя бы одну позицию, затем скопируйте расчет.";
    return;
  }

  const text = ["Кубатурник Северной пилорамы", buildCalculationText()].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "Расчет скопирован. Его можно вставить в сообщение или заявку.";
  } catch {
    copyStatus.textContent = text;
  }
});

const openCallbackModal = () => {
  callbackModal.classList.add("is-open");
  callbackModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  document.querySelector("#client-name").focus();
};

const closeCallbackModal = () => {
  callbackModal.classList.remove("is-open");
  callbackModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const setDealStatus = (message, state = "") => {
  dealStatus.className = `deal-status ${state}`.trim();
  dealStatus.textContent = message;
};

const createBitrixDeal = async ({ name, phone, email }) => {
  const calculation = buildCalculationText();

  const response = await fetch("/api/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      phone,
      email,
      calculation,
      total: currentTotals.total,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Bitrix24 не принял заявку");
  }

  return { id: data.dealId, contactId: data.contactId };
};

openCallbackButtons.forEach((button) => {
  button.addEventListener("click", openCallbackModal);
});

closeCallbackButtons.forEach((button) => {
  button.addEventListener("click", closeCallbackModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && callbackModal.classList.contains("is-open")) {
    closeCallbackModal();
  }
});

callbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(callbackForm);
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!name || !phone || !email) {
    setDealStatus("Заполните имя, телефон и почту.", "error");
    return;
  }

  setDealStatus("Создаем сделку в Bitrix24...");

  try {
    await createBitrixDeal({ name, phone, email });
    setDealStatus("Ваш заказ принят, ожидайте ответа оператора.", "success");
    callbackForm.reset();
  } catch (error) {
    setDealStatus(`${error.message}. Проверьте webhook Bitrix24 и попробуйте еще раз.`, "error");
  }
});

updatePreview();
renderItems();
