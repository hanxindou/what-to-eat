"use strict";

// 所有菜名仅保存在当前浏览器 localStorage；本站不请求任何后端。
const STORAGE_KEY = "what-to-eat:foods:v1";
const MAX_FOODS = 500;
const MAX_NAME = 36;
const SAMPLES = ["黄焖鸡米饭", "麻辣烫", "兰州拉面", "猪脚饭", "煲仔饭", "砂锅米线", "汉堡"];
const $ = (id) => document.getElementById(id);

const state = { foods: [], editingId: null, lastResult: null, drawing: false, toastTimer: null };

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validateNames(value) {
  if (!Array.isArray(value) || value.length > MAX_FOODS) throw new Error("食谱格式错误或菜品超过 500 道");
  const unique = new Set();
  const names = [];
  for (const raw of value) {
    const name = normalizeName(raw);
    if (!name || name.length > MAX_NAME) throw new Error("菜名必须为 1–36 个字符");
    const key = name.toLocaleLowerCase();
    if (unique.has(key)) throw new Error("导入文件包含重复菜名");
    unique.add(key);
    names.push(name);
  }
  return names;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2700);
}

function loadFoods() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return SAMPLES.map((name) => ({ id: createId(), name }));
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.foods)) throw new Error("版本或格式不正确");
    const names = validateNames(data.foods.map((entry) => entry?.name));
    return names.map((name, index) => ({ id: String(data.foods[index].id ?? createId()), name }));
  } catch (error) {
    console.warn("本地食谱读取失败：", error);
    showToast("读取已有食谱失败，请先检查浏览器存储数据");
    return [];
  }
}

function commitFoods(nextFoods) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, foods: nextFoods }));
    state.foods = nextFoods;
    state.lastResult = null;
    render();
    return true;
  } catch (error) {
    console.error("食谱保存失败：", error);
    showToast("保存失败：请检查浏览器存储权限或剩余空间");
    return false;
  }
}

function render() {
  const count = state.foods.length;
  $("tab-food-count").textContent = String(count);
  $("menu-food-count").textContent = String(count);
  $("draw-footnote").textContent = count
    ? `当前有 ${count} 道备选，每道菜被抽中的概率相同。`
    : "食谱还是空的，先添加一道想吃的菜吧。";
  if (!state.drawing) {
    $("draw-result").textContent = state.lastResult ?? (count ? "今天吃点什么呢？" : "食谱空空如也");
    $("stage-caption").textContent = state.lastResult ? "今天就决定吃" : "让好运帮你决定";
    $("stage-hint").textContent = state.lastResult ? "不满意的话，可以再抽一次" : (count ? "按下按钮，从食谱里抽一道菜" : "去「我的食谱」添加美食吧");
    $("draw-button-text").textContent = state.lastResult ? "再抽一次" : "帮我决定！";
    $("plate").textContent = state.lastResult ? "🥢" : "🍽️";
  }
  $("draw-button").disabled = count === 0 || state.drawing;
  renderFoodList();
}

function renderFoodList() {
  const filter = normalizeName($("food-search").value).toLocaleLowerCase();
  const items = state.foods.filter((food) => food.name.toLocaleLowerCase().includes(filter));
  const list = $("food-list");
  list.replaceChildren();
  $("empty-list").hidden = items.length !== 0;
  $("empty-list").textContent = state.foods.length === 0
    ? "还没有菜品。在上方添加第一道想吃的菜吧。"
    : "没有找到符合条件的菜名。";

  items.forEach((food) => {
    const li = document.createElement("li");
    li.className = "food-row";

    const number = document.createElement("span");
    number.className = "food-number";
    number.textContent = String(state.foods.indexOf(food) + 1).padStart(2, "0");

    const name = document.createElement("span");
    name.className = "food-name";
    name.textContent = food.name;

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "icon-button";
    edit.textContent = "✎";
    edit.setAttribute("aria-label", `编辑${food.name}`);
    edit.addEventListener("click", () => beginEdit(food.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button danger";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `删除${food.name}`);
    remove.addEventListener("click", () => deleteFood(food.id));

    li.append(number, name, edit, remove);
    list.append(li);
  });
}

function switchTab(which) {
  const draw = which === "draw";
  $("panel-draw").hidden = !draw;
  $("panel-menu").hidden = draw;
  $("tab-draw").classList.toggle("is-active", draw);
  $("tab-menu").classList.toggle("is-active", !draw);
  $("tab-draw").toggleAttribute("aria-current", draw);
  $("tab-menu").toggleAttribute("aria-current", !draw);
}

function resetForm() {
  state.editingId = null;
  $("food-input").value = "";
  $("food-form-label").textContent = "添加一道想吃的菜";
  $("save-food").textContent = "＋ 添加";
  $("cancel-edit").hidden = true;
}

function beginEdit(id) {
  const found = state.foods.find((food) => food.id === id);
  if (!found) return;
  state.editingId = id;
  $("food-input").value = found.name;
  $("food-form-label").textContent = "修改这道菜的名称";
  $("save-food").textContent = "✓ 保存";
  $("cancel-edit").hidden = false;
  $("food-input").focus();
  $("food-input").select();
}

function saveFood(event) {
  event.preventDefault();
  const name = normalizeName($("food-input").value);
  if (!name || name.length > MAX_NAME) { showToast("菜名应为 1–36 个字符"); return; }
  const duplicate = state.foods.some((food) => food.id !== state.editingId && food.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (duplicate) { showToast("食谱里已经有这道菜了"); return; }
  let next;
  if (state.editingId) {
    next = state.foods.map((food) => food.id === state.editingId ? { ...food, name } : food);
  } else {
    if (state.foods.length >= MAX_FOODS) { showToast("最多支持 500 道菜"); return; }
    next = [...state.foods, { id: createId(), name }];
  }
  if (commitFoods(next)) {
    showToast(state.editingId ? "菜名已修改" : "已加入食谱");
    resetForm();
    $("food-search").value = "";
    renderFoodList();
  }
}

function deleteFood(id) {
  const found = state.foods.find((food) => food.id === id);
  if (!found || !window.confirm(`确定删除「${found.name}」吗？`)) return;
  if (commitFoods(state.foods.filter((food) => food.id !== id))) {
    if (state.editingId === id) resetForm();
    showToast("已删除");
  }
}

function drawFood() {
  if (state.drawing || state.foods.length === 0) return;
  state.drawing = true;
  $("draw-button").disabled = true;
  $("draw-button-text").textContent = "抽签中...";
  $("stage-caption").textContent = "正在寻找你的今日美食";
  $("stage-hint").textContent = "美味即将揭晓";
  $("plate").classList.add("is-rolling");
  const names = state.foods.map((food) => food.name);
  let ticks = 0;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const totalTicks = reduced ? 1 : 15;
  const interval = setInterval(() => {
    $("draw-result").textContent = names[Math.floor(Math.random() * names.length)];
    ticks++;
    if (ticks >= totalTicks) {
      clearInterval(interval);
      // 最终抽签独立于上方滚动动画。每道菜均匀随机抽中，可连续重复。
      state.lastResult = names[Math.floor(Math.random() * names.length)];
      state.drawing = false;
      $("plate").classList.remove("is-rolling");
      render();
    }
  }, reduced ? 1 : 78);
}

function exportFoods() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), foods: state.foods.map((food) => food.name) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `今天吃什么-食谱备份-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast("备份文件已生成");
}

async function importFoods(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > 1024 * 1024) { showToast("文件超过 1 MB，请检查内容"); return; }
  try {
    const data = JSON.parse(await file.text());
    if (!data || data.version !== 1) throw new Error("文件版本不匹配");
    const names = validateNames(data.foods);
    if (!window.confirm(`将用文件中的 ${names.length} 道菜覆盖当前 ${state.foods.length} 道菜。确定导入吗？`)) return;
    if (commitFoods(names.map((name) => ({ id: createId(), name })))) {
      resetForm();
      $("food-search").value = "";
      renderFoodList();
      showToast(`导入成功，共 ${names.length} 道菜`);
    }
  } catch (error) {
    console.warn("导入失败：", error);
    showToast(`导入失败：${error.message}`);
  }
}

function main() {
  state.foods = loadFoods();
  $("tab-draw").addEventListener("click", () => switchTab("draw"));
  $("tab-menu").addEventListener("click", () => switchTab("menu"));
  $("draw-button").addEventListener("click", drawFood);
  $("food-form").addEventListener("submit", saveFood);
  $("cancel-edit").addEventListener("click", resetForm);
  $("food-search").addEventListener("input", renderFoodList);
  $("export-button").addEventListener("click", exportFoods);
  $("import-button").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", importFoods);
  render();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("离线缓存注册失败：", error));
    });
  }
}
main();
