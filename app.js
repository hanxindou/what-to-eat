"use strict";

// 所有菜名仅保存在当前浏览器 localStorage；本站不请求任何后端。
const STORAGE_KEY = "what-to-eat:foods:v1";
const MAX_FOODS = 500;
const MAX_NAME = 36;
const SAMPLES = ["黄焖鸡米饭", "麻辣烫", "兰州拉面", "猪脚饭", "煲仔饭", "砂锅米线", "汉堡"];
const $ = (id) => document.getElementById(id);

const state = { foods: [], editingId: null, lastResult: null, drawing: false, drawTimer: null, toastTimer: null, celebrationTimer: null };

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function resetDrawEffects() {
  clearInterval(state.drawTimer);
  clearTimeout(state.celebrationTimer);
  state.drawTimer = null;
  state.drawing = false;
  $("plate").classList.remove("is-rolling");
  $("draw-card").classList.remove("is-drawing", "is-revealed");
  $("draw-result").setAttribute("aria-busy", "false");
  $("celebration").replaceChildren();
}

function celebrate() {
  if (prefersReducedMotion()) return;
  const positions = [[-100,-113],[-58,-133],[4,-140],[65,-128],[115,-93],[-125,-45],[123,-33],[-108,20],[99,30],[-65,66],[54,75],[1,88]];
  const burst = $("celebration");
  positions.forEach(([x, y], index) => {
    const particle = document.createElement("span");
    particle.className = `celebration-particle ${index % 4 === 0 ? "particle-bow" : "particle-heart"}`;
    particle.style.setProperty("--dx", `${x}px`);
    particle.style.setProperty("--dy", `${y}px`);
    particle.style.setProperty("--delay", `${index % 3 * 45}ms`);
    particle.style.setProperty("--spin", `${index % 2 ? 28 : -28}deg`);
    burst.append(particle);
  });
  state.celebrationTimer = setTimeout(() => burst.replaceChildren(), 1350);
}

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
    resetDrawEffects();
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
    ? `${count} 道美味，两个人的下一顿小幸福 ♡`
    : "先收藏一份喜欢，再拆开美味惊喜吧 ♡";
  if (!state.drawing) {
    $("draw-result").textContent = state.lastResult ?? (count ? "今天，一起吃什么？" : "心动菜单空空的");
    $("stage-caption").textContent = state.lastResult ? "飞飞 ♡ 粉粉，一起开饭啦" : "飞飞和粉粉的美味小魔法";
    $("stage-hint").textContent = state.lastResult ? "一人一口小幸福，今天也要甜甜的 ♡" : (count ? "菜单慢慢选，饭要一起好好吃" : "去「心动菜单」收藏我们想吃的美味吧");
    $("draw-button-text").textContent = state.lastResult ? "再抽一份甜蜜" : (count ? "抽一份双人小幸福" : "先去收藏美味");
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
    ? "菜单还空着呢，把第一份喜欢的味道收进来吧 ♡"
    : "这份美味还没收藏，换个名字找找吧。";

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
  $(draw ? "tab-draw" : "tab-menu").setAttribute("aria-current", "page");
  $(draw ? "tab-menu" : "tab-draw").removeAttribute("aria-current");
}

function resetForm() {
  state.editingId = null;
  $("food-input").value = "";
  $("food-form-label").textContent = "把我们想吃的，都收进来";
  $("save-food").textContent = "＋ 加入";
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
  if (duplicate) { showToast("这份美味已经在菜单里啦 ♡"); return; }
  let next;
  if (state.editingId) {
    next = state.foods.map((food) => food.id === state.editingId ? { ...food, name } : food);
  } else {
    if (state.foods.length >= MAX_FOODS) { showToast("最多支持 500 道菜"); return; }
    next = [...state.foods, { id: createId(), name }];
  }
  if (commitFoods(next)) {
    showToast(state.editingId ? "美味名字已更新" : "已收进心动菜单 ♡");
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
    showToast("已从菜单移除");
  }
}

function drawFood() {
  if (state.drawing || state.foods.length === 0) return;
  resetDrawEffects();
  state.drawing = true;
  $("draw-card").classList.add("is-drawing");
  $("draw-result").setAttribute("aria-busy", "true");
  $("draw-button").disabled = true;
  $("draw-button-text").textContent = "美味魔法施展中…";
  $("stage-caption").textContent = "让小幸运转个圈";
  $("stage-hint").textContent = "嘘，你的美味惊喜马上就来";
  $("plate").classList.add("is-rolling");
  const names = state.foods.map((food) => food.name);
  let ticks = 0;
  const reduced = prefersReducedMotion();
  const totalTicks = reduced ? 1 : 15;
  state.drawTimer = setInterval(() => {
    $("draw-result").textContent = names[Math.floor(Math.random() * names.length)];
    ticks++;
    if (ticks >= totalTicks) {
      clearInterval(state.drawTimer);
      state.drawTimer = null;
      // 最终抽签独立于上方滚动动画。每道菜均匀随机抽中，可连续重复。
      state.lastResult = names[Math.floor(Math.random() * names.length)];
      state.drawing = false;
      $("plate").classList.remove("is-rolling");
      $("draw-card").classList.remove("is-drawing");
      render();
      $("draw-result").setAttribute("aria-busy", "false");
      $("draw-card").classList.add("is-revealed");
      celebrate();
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
  showToast("菜单备份已准备好 ♡");
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
      showToast(`找回了 ${names.length} 道心动美味 ♡`);
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
