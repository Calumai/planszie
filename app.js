const trackingStartKey = "2026-05-19";
const todayKey = getLocalDateKey();
const storageKey = `fatLossCompanion:${todayKey}`;
const weightKey = "fatLossCompanion:weights";
const aiSettingsKey = "fatLossCompanion:aiSettings";
const gasSettingsKey = "fatLossCompanion:gasSettings";
const fixedGasUrl = "https://script.google.com/macros/s/AKfycbzbYDTgjK4oL0KYJ9X_mvfym59Sc35HE8FgH_67QTjAazDIDbmscql4yO_ee5resG08/exec";
const historyRecords = Array.isArray(window.fatLossHistory) ? window.fatLossHistory : [];
const gasSeedRows = Array.isArray(window.fatLossGasSeedRows) ? window.fatLossGasSeedRows : [];

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyToLocalDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMissionDay(dateKey = todayKey) {
  const dayMs = 24 * 60 * 60 * 1000;
  const startDate = dateKeyToLocalDate(trackingStartKey);
  const currentDate = dateKeyToLocalDate(dateKey);
  return Math.max(1, Math.floor((currentDate - startDate) / dayMs) + 1);
}

const defaultState = {
  dayType: "normal",
  stage: "discipline",
  habits: {
    water: false,
    noSugaryDrink: false,
    recovery: false,
  },
  body: {
    weight: "",
    waist: "",
    sleepHours: "",
    hungerLevel: "",
    energyLevel: "",
    kneeStatus: "",
    calfSoreness: "",
    bodyNote: "",
  },
  foods: [],
  exercises: [],
};

const targets = {
  normal: { calories: 1700, carbs: 150 },
  training: { calories: 1800, carbs: 180 },
  rest: { calories: 1550, carbs: 130 },
};

const proteinTarget = 100;
const fatTarget = 60;
const stages = {
  inspiration: {
    label: "啟發 Inspiration",
    task: "強化為什麼開始",
    reminder: "今天先回到你的理由：你不是為了完美一天，而是為了一年後更輕鬆的身體。",
    minimum: "寫下一個想瘦到65kg的原因，然後記錄今天吃了什麼。",
  },
  motivation: {
    label: "動力 Motivation",
    task: "拆小目標",
    reminder: "不用盯著34kg，今天的小目標是完成記錄，本週的小目標是運動3～4次。",
    minimum: "只完成一件事：記一餐、快走10分鐘，或晚餐不喝含糖飲料。",
  },
  intention: {
    label: "意圖 Intention",
    task: "建立明確計畫",
    reminder: "目標不是願望，今天照你的規則走：每餐蛋白質、碳水不妖魔化、不強制斷食。",
    minimum: "晚餐有蛋白質，主食照訓練日或休息日調整，不用硬餓。",
  },
  discipline: {
    label: "紀律 Discipline",
    task: "給最低標準",
    reminder: "動力不夠時，用最低標準守住軌道。今天不是拚滿分，是不要斷線。",
    minimum: "不喝含糖飲料、晚餐有蛋白質、睡前簡單記錄。",
  },
  habit: {
    label: "習慣 Habit",
    task: "固定流程",
    reminder: "把流程固定下來：早上量體重，中午記第一餐，運動後記運動，睡前看總結。",
    minimum: "照流程完成一格也算：體重、飲食、運動、總結，選一個做。",
  },
  passion: {
    label: "熱情 Passion",
    task: "創造成就感",
    reminder: "開始享受變穩的自己。今天找一個小成就收藏起來。",
    minimum: "寫下一件進步：比較會選食物、沒有因為甜食放棄、或運動後更有精神。",
  },
};

const rickyMealTemplate = [
  {
    mealType: "早餐",
    foodName: "水煮蛋1顆、無糖優格150g、燕麥20g、奇亞籽5g、芭樂100g",
    calories: 360,
    protein: 24,
    carbs: 42,
    fat: 11,
  },
  {
    mealType: "午餐",
    foodName: "黑胡椒雞胸健康餐盒，飯半份或飯換菜，海藻/蔬菜沙拉",
    calories: 470,
    protein: 42,
    carbs: 45,
    fat: 13,
  },
  {
    mealType: "點心",
    foodName: "運動前：乳清20g、冷藏蒸芋頭或地瓜100-150g",
    calories: 240,
    protein: 18,
    carbs: 38,
    fat: 2,
  },
  {
    mealType: "點心",
    foodName: "運動後：乳清25g、冷藏蒸地瓜150g",
    calories: 270,
    protein: 23,
    carbs: 42,
    fat: 2,
  },
  {
    mealType: "晚餐",
    foodName: "椒鹽/舒肥雞胸健康餐盒，半飯，加菜，醬料少",
    calories: 430,
    protein: 40,
    carbs: 38,
    fat: 12,
  },
];

const rickyWorkoutTemplate = {
  exerciseType: "重訓",
  duration: 70,
  caloriesBurned: 360,
  heartRate: "",
  kneeStatus: "以低衝擊器械為主，腿推膝蓋不鎖死",
  calfSoreness: "收尾有氧選橢圓機或腳踏車，避免跑跳",
  note:
    "Ricky風格器械日：快走6-8分鐘；高位下拉3組、坐姿划船3組、反向飛鳥2-3組、腿推3組、臀外展3組、三頭2組；橢圓機/腳踏車8-12分鐘；背闊肌、胸、肩後側、小腿伸展。姿勢重點：下拉先沉肩再拉、划船不圓背、反向飛鳥不聳肩、腿推膝蓋跟腳尖同方向且不鎖死，小腿痠就降低有氧阻力。",
};

const gasCode = `var SHEET_NAME = "FatLossCompanion";
var PAYLOAD_SHEET_NAME = "FatLossCompanion_Payload";
var HEADERS = ["Date", "Weight", "Waist", "Diet_Summary", "Exercise", "Cal_Median", "Protein", "Note"];
var PAYLOAD_HEADERS = ["Date", "Payload", "UpdatedAt"];
var HISTORICAL_ROWS = ${JSON.stringify(gasSeedRows, null, 2)};

function ensureHeaders_(sheet, headers) {
  var currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var shouldReset = headers.some(function(header, index) {
    return currentHeaders[index] !== header;
  });

  if (shouldReset) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function normalizeCell_(value) {
  return value === null || value === undefined ? "" : value;
}

function formatDateCell_(value) {
  return value instanceof Date
    ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd")
    : String(value || "").substring(0, 10);
}

function findRowIndexByDate_(sheet, dateStr) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return -1;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var index = 0; index < values.length; index++) {
    if (formatDateCell_(values[index][0]) === dateStr) {
      return index + 2;
    }
  }

  return -1;
}

function upsertRowByDate_(sheet, rowData) {
  var dateStr = formatDateCell_(rowData[0]);
  var rowIndex = findRowIndexByDate_(sheet, dateStr);

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function toVisibleRow_(data) {
  return [
    data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    normalizeCell_(data.weight),
    normalizeCell_(data.waist),
    normalizeCell_(data.dietSummary || data.diet_summary || ""),
    normalizeCell_(data.exercise),
    normalizeCell_(data.calMedian != null ? data.calMedian : data.calories),
    normalizeCell_(data.protein),
    normalizeCell_(data.note || data.notes || ""),
  ];
}

function getSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  ensureHeaders_(sheet, HEADERS);
  ensureHistoricalRows_(sheet);
  return sheet;
}

function getPayloadSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(PAYLOAD_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(PAYLOAD_SHEET_NAME);
    sheet.hideSheet();
  }
  ensureHeaders_(sheet, PAYLOAD_HEADERS);
  return sheet;
}

function ensureHistoricalRows_(sheet) {
  if (!HISTORICAL_ROWS.length) {
    return;
  }

  var existingDates = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    values.forEach(function(row) {
      var dateStr = formatDateCell_(row[0]);
      if (dateStr) {
        existingDates[dateStr] = true;
      }
    });
  }

  var missingRows = HISTORICAL_ROWS
    .filter(function(row) {
      return row.date && !existingDates[row.date];
    })
    .map(toVisibleRow_);

  if (missingRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, missingRows.length, HEADERS.length).setValues(missingRows);
  }
}

function upsertPayload_(dateStr, data) {
  var sheet = getPayloadSheet_();
  var rowData = [dateStr, JSON.stringify(data), new Date()];
  var rowIndex = findRowIndexByDate_(sheet, dateStr);

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function getPayloadMap_() {
  var sheet = getPayloadSheet_();
  var lastRow = sheet.getLastRow();
  var payloadMap = {};

  if (lastRow <= 1) {
    return payloadMap;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  values.forEach(function(row) {
    var dateStr = formatDateCell_(row[0]);
    if (!dateStr || !row[1]) {
      return;
    }

    try {
      payloadMap[dateStr] = JSON.parse(row[1]);
    } catch (err) {
      payloadMap[dateStr] = {};
    }
  });

  return payloadMap;
}

function seedHistoricalData() {
  var sheet = getSheet_();
  ensureHistoricalRows_(sheet);
  return ContentService
    .createTextOutput(JSON.stringify({ status: "success", rows: HISTORICAL_ROWS.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = getSheet_();
    var data = JSON.parse(e.postData.contents || "{}");
    var dateStr = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    data.date = dateStr;

    upsertRowByDate_(sheet, toVisibleRow_(data));
    upsertPayload_(dateStr, data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  var sheet = getSheet_();
  var payloadMap = getPayloadMap_();
  var values = sheet.getDataRange().getValues();
  var data = values.slice(1).map(function(row) {
    var dateStr = formatDateCell_(row[0]);
    var payload = payloadMap[dateStr] || {};
    payload.date = payload.date || dateStr;
    payload.weight = payload.weight || row[1] || "";
    payload.waist = payload.waist || row[2] || "";
    payload.dietSummary = payload.dietSummary || row[3] || "";
    payload.exercise = payload.exercise || row[4] || "";
    payload.calMedian = payload.calMedian || row[5] || "";
    payload.protein = payload.protein || row[6] || "";
    payload.note = payload.note || row[7] || "";
    return payload;
  });

  return ContentService
    .createTextOutput(JSON.stringify({ status: "success", data: data, latest: data[data.length - 1] || null }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

let state = loadState();
let weights = loadWeights();
let aiSettings = loadAiSettings();
let gasSettings = loadGasSettings();
let deferredInstallPrompt = null;
let gasSyncTimer = null;
let calorieDraft = "";
let shouldReplaceCalorieDraft = false;
let quickCalorieDraft = "";
let shouldReplaceQuickCalorieDraft = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return {
      ...defaultState,
      ...saved,
      habits: { ...defaultState.habits, ...(saved?.habits || {}) },
      body: { ...defaultState.body, ...(saved?.body || {}) },
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  scheduleGasSync();
}

function loadWeights() {
  try {
    const saved = JSON.parse(localStorage.getItem(weightKey));
    if (saved?.length) {
      return saved;
    }
  } catch {
    // Fall through to imported history.
  }

  const importedWeights = historyRecords
    .filter((item) => Number(item.weight) > 0)
    .map((item) => ({ date: item.date, weight: Number(item.weight) }));

  return importedWeights.length ? importedWeights : [{ date: todayKey, weight: 93.1 }];
}

function saveWeights() {
  localStorage.setItem(weightKey, JSON.stringify(weights));
  scheduleGasSync();
}

function saveTodayWeight(weight) {
  if (!weight) {
    return;
  }

  const existingIndex = weights.findIndex((item) => item.date === todayKey);
  const entry = { date: todayKey, weight: Number(weight) };

  if (existingIndex >= 0) {
    weights[existingIndex] = entry;
  } else {
    weights.push(entry);
  }

  saveWeights();
}

function loadAiSettings() {
  try {
    return {
      apiKey: "",
      model: "gpt-4.1-mini",
      ...JSON.parse(localStorage.getItem(aiSettingsKey)),
    };
  } catch {
    return { apiKey: "", model: "gpt-4.1-mini" };
  }
}

function saveAiSettings() {
  localStorage.setItem(aiSettingsKey, JSON.stringify(aiSettings));
}

function loadGasSettings() {
  return { gasUrl: fixedGasUrl };
}

function saveGasSettings() {
  gasSettings = { gasUrl: fixedGasUrl };
  localStorage.setItem(gasSettingsKey, JSON.stringify(gasSettings));
}

function getAllAppStorage() {
  const localStorageData = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("fatLossCompanion:")) {
      localStorageData[key] = localStorage.getItem(key);
    }
  }
  return localStorageData;
}

function buildGasDietSummary() {
  if (!state.foods.length) {
    return "未記錄";
  }

  return state.foods.map((food) => `${food.mealType}:${food.foodName}`).join(" | ");
}

function buildGasExerciseSummary() {
  if (!state.exercises.length) {
    return "未記錄";
  }

  return state.exercises
    .map((exercise) => `${exercise.exerciseType}${exercise.duration ? `${exercise.duration}分` : ""}`)
    .join("；");
}

function getCloudPayload() {
  const totals = getTotals();
  return {
    date: todayKey,
    weight: state.body.weight || "",
    waist: state.body.waist || "",
    dietSummary: buildGasDietSummary(),
    exercise: buildGasExerciseSummary(),
    calMedian: totals.calories || "",
    protein: totals.protein || "",
    note: [
      `階段：${stages[state.stage]?.label || state.stage}`,
      `熱量：${formatNumber(totals.calories)} kcal`,
      `蛋白質：${formatNumber(totals.protein)} g`,
      `睡眠：${state.body.sleepHours || "未填"}`,
      `飢餓：${state.body.hungerLevel || "未填"}`,
      `精神：${state.body.energyLevel || "未填"}`,
      `膝蓋：${state.body.kneeStatus || "未填"}`,
      `小腿：${state.body.calfSoreness || "未填"}`,
      state.body.bodyNote ? `備註：${state.body.bodyNote}` : "",
    ]
      .filter(Boolean)
      .join("；"),
    payload: {
      state,
      weights,
      aiSettings: { ...aiSettings, apiKey: aiSettings.apiKey ? "[stored-locally]" : "" },
      localStorage: getAllAppStorage(),
    },
  };
}

function applyCloudPayload(payload) {
  const fullPayload = payload?.payload || payload?.data?.payload;
  const localStorageData = fullPayload?.localStorage || payload?.localStorage;

  if (localStorageData) {
    Object.entries(localStorageData).forEach(([key, value]) => {
      if (key.startsWith("fatLossCompanion:") && typeof value === "string") {
        localStorage.setItem(key, value);
      }
    });
  } else if (payload?.date && payload?.weight) {
    state.body.weight = String(payload.weight);
    saveTodayWeight(payload.weight);
  }

  state = loadState();
  weights = loadWeights();
  aiSettings = loadAiSettings();
  gasSettings = loadGasSettings();
  render();
}

function setGasStatus(message) {
  const status = $("#gasStatus");
  if (status) {
    status.textContent = message;
  }
  const backupStatus = $("#backupStatus");
  if (backupStatus) {
    backupStatus.textContent = message;
  }
}

function scheduleGasSync() {
  clearTimeout(gasSyncTimer);
  gasSyncTimer = setTimeout(() => {
    pushToGas({ silent: true });
  }, 900);
}

async function pushToGas({ silent = false } = {}) {
  if (!silent) {
    setGasStatus("正在推送到 Google Sheets...");
  }

  await fetch(fixedGasUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getCloudPayload()),
  });

  setGasStatus(silent ? "已自動同步到 GAS。" : "已推送到 GAS。");
}

async function pullFromGas() {
  setGasStatus("正在從 GAS 讀取...");
  const response = await fetch(fixedGasUrl);
  const result = await response.json();
  const latest = result.latest || result.data?.at?.(-1);

  if (!latest) {
    setGasStatus("GAS 目前沒有可讀取資料。");
    return;
  }

  applyCloudPayload(latest);
  setGasStatus("已從 GAS 還原最新資料。");
}

function exportAllData() {
  const data = {
    exportedAt: new Date().toISOString(),
    app: "AI減脂陪跑助手",
    version: 1,
    localStorage: getAllAppStorage(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `減脂陪跑備份-${todayKey}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importAllData(file) {
  const backup = JSON.parse(await file.text());
  if (!backup.localStorage || typeof backup.localStorage !== "object") {
    throw new Error("備份格式不正確");
  }

  Object.entries(backup.localStorage).forEach(([key, value]) => {
    if (key.startsWith("fatLossCompanion:") && typeof value === "string") {
      localStorage.setItem(key, value);
    }
  });

  state = loadState();
  weights = loadWeights();
  aiSettings = loadAiSettings();
  render();
}

function sum(items, field) {
  return items.reduce((total, item) => total + Number(item[field] || 0), 0);
}

function getTotals() {
  return {
    calories: sum(state.foods, "calories"),
    protein: sum(state.foods, "protein"),
    carbs: sum(state.foods, "carbs"),
    fat: sum(state.foods, "fat"),
    exercise: sum(state.exercises, "caloriesBurned"),
  };
}

function getHabitScore() {
  const totals = getTotals();
  return [
    state.foods.length > 0 ? 20 : 0,
    totals.protein > 0 ? 20 : 0,
    state.habits.water ? 10 : 0,
    state.exercises.length > 0 ? 20 : 0,
    state.habits.noSugaryDrink ? 10 : 0,
    state.habits.recovery ? 20 : 0,
  ].reduce((total, score) => total + score, 0);
}

function activeTarget() {
  return targets[state.dayType] || targets.normal;
}

function estimateFood(text) {
  const lower = text.toLowerCase();
  const rules = [
    { test: /雞|chicken/, calories: 250, protein: 38, carbs: 0, fat: 7 },
    { test: /飯|米|燕麥飯/, calories: 230, protein: 5, carbs: 48, fat: 2 },
    { test: /地瓜|番薯/, calories: 180, protein: 3, carbs: 42, fat: 0 },
    { test: /沙拉|青菜|蔬菜/, calories: 90, protein: 3, carbs: 12, fat: 3 },
    { test: /高蛋白|乳清|protein/, calories: 130, protein: 23, carbs: 5, fat: 2 },
    { test: /蛋糕|水果派|派/, calories: 330, protein: 5, carbs: 42, fat: 17 },
    { test: /西瓜|水果|香蕉|蘋果/, calories: 100, protein: 1, carbs: 25, fat: 0 },
    { test: /蛋|茶葉蛋/, calories: 80, protein: 7, carbs: 1, fat: 5 },
    { test: /魚|鮭魚|鮪魚/, calories: 240, protein: 30, carbs: 0, fat: 12 },
    { test: /便當|外食/, calories: 650, protein: 32, carbs: 78, fat: 22 },
  ];

  const matched = rules.filter((rule) => rule.test.test(lower));
  if (!matched.length) {
    return { calories: 420, protein: 22, carbs: 45, fat: 14 };
  }

  return matched.reduce(
    (total, rule) => ({
      calories: total.calories + rule.calories,
      protein: total.protein + rule.protein,
      carbs: total.carbs + rule.carbs,
      fat: total.fat + rule.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function updateCalorieDisplay(value = calorieDraft) {
  const display = $("#calorieDisplay");
  if (!display) {
    return;
  }

  display.textContent = value || "0";
}

function updateQuickCalorieDisplay(value = quickCalorieDraft) {
  const display = $("#quickCalorieDisplay");
  if (!display) {
    return;
  }

  display.textContent = value || "0";
}

function calculateDraftValue() {
  const parts = calorieDraft
    .split("+")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (!parts.length) {
    return 0;
  }

  return parts.reduce((total, value) => total + value, 0);
}

function calculateQuickDraftValue() {
  const parts = quickCalorieDraft
    .split("+")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (!parts.length) {
    return 0;
  }

  return parts.reduce((total, value) => total + value, 0);
}

function fillCaloriesFromDraft() {
  const form = $("#foodForm");
  const calories = calculateDraftValue();
  if (!calories) {
    return;
  }

  form.elements.calories.value = calories;
  shouldReplaceCalorieDraft = true;
  $("#foodEstimate").textContent = `已填入 ${formatNumber(calories)} kcal。若這餐有多個品項，可以用 320＋180 這樣相加。`;
}

function addQuickCalories() {
  const calories = calculateQuickDraftValue();
  if (!calories) {
    const status = $("#quickCalorieStatus");
    if (status) {
      status.textContent = "先輸入熱量數字，再按加入。";
    }
    return;
  }

  state.foods.push({
    id: createId(),
    mealType: "快速",
    foodName: "首頁快速輸入",
    calories,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  saveState();
  quickCalorieDraft = "";
  shouldReplaceQuickCalorieDraft = false;
  updateQuickCalorieDisplay();
  const status = $("#quickCalorieStatus");
  if (status) {
    status.textContent = `已加入 ${formatNumber(calories)} kcal。`;
  }
  render();
}

function applyEstimateToFoodForm() {
  const form = $("#foodForm");
  const foodName = form.elements.foodName.value.trim();
  if (!foodName) {
    $("#recognitionStatus").textContent = "先輸入餐點內容，我才能幫你估算。";
    return;
  }

  const estimate = estimateFood(foodName);
  form.elements.calories.value = estimate.calories;
  form.elements.protein.value = estimate.protein;
  form.elements.carbs.value = estimate.carbs;
  form.elements.fat.value = estimate.fat;
  calorieDraft = String(estimate.calories);
  shouldReplaceCalorieDraft = true;
  updateCalorieDisplay();
  $("#foodEstimate").textContent = `辨識後先估 ${formatNumber(estimate.calories)} kcal，蛋白質 ${formatNumber(estimate.protein)}g、碳水 ${formatNumber(estimate.carbs)}g、脂肪 ${formatNumber(estimate.fat)}g。`;
  $("#recognitionStatus").textContent = "已用本機食材規則填入估算，可再手動微調。";
}

function addMacroPreset(kind) {
  const form = $("#foodForm");
  const presets = {
    protein: ["protein", 20],
    carbs: ["carbs", 30],
    fat: ["fat", 10],
  };
  const preset = presets[kind];

  if (!preset) {
    return;
  }

  const [fieldName, value] = preset;
  const field = form.elements[fieldName];
  field.value = Number(field.value || 0) + value;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function parseNutritionJson(text) {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || text;
  const parsed = JSON.parse(jsonText);

  return {
    foodName: parsed.foodName || parsed.food || parsed.name || "",
    calories: Number(parsed.calories) || 0,
    protein: Number(parsed.protein) || 0,
    carbs: Number(parsed.carbs) || 0,
    fat: Number(parsed.fat) || 0,
  };
}

async function recognizeFoodPhoto(file) {
  const status = $("#recognitionStatus");
  const preview = $("#photoPreview");
  const dataUrl = await fileToDataUrl(file);

  preview.src = dataUrl;
  preview.hidden = false;

  if (!aiSettings.apiKey) {
    status.textContent = "照片已放上來。若要自動辨識照片，請先在 AI 教練頁儲存 OpenAI API Key；現在可先用文字描述後按辨識。";
    return;
  }

  status.textContent = "正在辨識照片中的餐點...";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: aiSettings.model || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "請辨識照片中的餐點並估算營養。只回傳 JSON，不要 Markdown。格式：{\"foodName\":\"餐點描述\",\"calories\":數字,\"protein\":數字,\"carbs\":數字,\"fat\":數字}。無法判斷時也請給保守估算。",
            },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("photo recognition failed");
  }

  const result = await response.json();
  const outputText =
    result.output_text ||
    result.output
      ?.flatMap((item) => item.content || [])
      ?.map((content) => content.text)
      ?.filter(Boolean)
      ?.join("\n") ||
    "";
  const estimate = parseNutritionJson(outputText);
  const form = $("#foodForm");

  if (estimate.foodName) {
    form.elements.foodName.value = estimate.foodName;
  }
  form.elements.calories.value = estimate.calories || "";
  form.elements.protein.value = estimate.protein || "";
  form.elements.carbs.value = estimate.carbs || "";
  form.elements.fat.value = estimate.fat || "";
  calorieDraft = estimate.calories ? String(estimate.calories) : "";
  shouldReplaceCalorieDraft = true;
  updateCalorieDisplay();
  status.textContent = "照片辨識已填入表單，送出前可以再修正。";
  $("#foodEstimate").textContent = `照片先估 ${formatNumber(estimate.calories)} kcal，蛋白質 ${formatNumber(estimate.protein)}g、碳水 ${formatNumber(estimate.carbs)}g、脂肪 ${formatNumber(estimate.fat)}g。`;
}

function estimateExercise(type, duration) {
  const perMinute = {
    快走: 5.2,
    跑步機: 6,
    室內腳踏車: 6.5,
    飛輪: 8,
    游泳: 7.5,
    重訓: 5.5,
    伸展: 2.5,
  };
  return Math.round((perMinute[type] || 5) * duration);
}

function formatNumber(value) {
  return Math.round(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function applyRickyMeals() {
  state.dayType = "training";
  const existingNames = new Set(state.foods.map((food) => food.foodName));
  rickyMealTemplate.forEach((food) => {
    if (!existingNames.has(food.foodName)) {
      state.foods.push({ id: createId(), ...food });
    }
  });
  saveState();
  render();
  $("#templateStatus").textContent = "已套用高碳重訓日飲食到今日紀錄。";
}

function applyRickyWorkout() {
  state.dayType = "training";
  state.exercises.push({ id: createId(), ...rickyWorkoutTemplate });
  saveState();
  render();
  $("#templateStatus").textContent = "已套用Ricky風格器械重訓到今日運動。";
}

function generateAdvice() {
  const totals = getTotals();
  const target = activeTarget();
  const remaining = target.calories - totals.calories + totals.exercise;
  const proteinGap = proteinTarget - totals.protein;
  const stage = stages[state.stage] || stages.discipline;

  if (!state.foods.length && !state.exercises.length) {
    return `${stage.reminder} 先記錄第一餐，我會幫你抓熱量、蛋白質和晚餐方向。`;
  }

  if (remaining < 150) {
    return "今天熱量已經接近目標，下一餐建議用高蛋白＋蔬菜收尾，主食抓小份就好。不是不能吃，是份量要漂亮。";
  }

  if (proteinGap > 25) {
    return `目前蛋白質還差大約 ${formatNumber(proteinGap)}g，晚餐可以選雞肉、魚、蛋或高蛋白飲。今天還有空間，穩穩補就好。`;
  }

  if (state.dayType === "training") {
    return "今天是重訓日，碳水不用太怕。晚餐選高蛋白、蔬菜和半份到一份主食，恢復會更穩。";
  }

  return "今天狀態很穩，晚餐可以正常吃，以高蛋白為主，主食照剩餘熱量調整半份或一份。";
}

function coachReply(question) {
  const q = question.trim();
  const totals = getTotals();
  const target = activeTarget();
  const remaining = target.calories - totals.calories + totals.exercise;

  if (/不想|沒動力|好累|懶|吃爆|失控|放棄/.test(q)) {
    return "今天啟動低動力版本：不用完美，只要守最低標準。1. 快走10分鐘或伸展5分鐘。2. 晚餐有蛋白質。3. 睡前把今天吃的記一下。這樣就算有回到軌道。";
  }

  if (/可以吃|能吃|蛋糕|水果派|甜點|炸/.test(q)) {
    return `可以吃，但建議抓小份。這類食物主要熱量通常來自油脂和精緻澱粉，不是完全不行。你今天大約還有 ${formatNumber(remaining)} kcal 空間，如果吃一小塊，下一餐主食減半、蛋白質照吃就很OK。`;
  }

  if (/晚餐|吃什麼/.test(q)) {
    return `晚餐建議走高蛋白＋蔬菜＋半份主食。可以選雞胸、雞腿去皮、魚、蛋或超商舒肥雞，避開豆漿優先。你今天剩餘約 ${formatNumber(remaining)} kcal，正常吃不用怕。`;
  }

  if (/碳水|飯|地瓜/.test(q)) {
    return `目前碳水是 ${formatNumber(totals.carbs)}g。重訓日可以高一點，一般日就抓穩。飯、地瓜都不是敵人，份量對了就是好隊友。`;
  }

  if (/痠|痛|膝|小腿/.test(q)) {
    return "如果是小腿痠，可以熱敷、伸展，今天把有氧降成輕鬆快走或腳踏車；如果是膝蓋痛或刺痛，先避開跑跳和高衝擊。恢復比硬操重要。";
  }

  if (/重訓|明天/.test(q)) {
    return "如果今天睡眠和膝蓋狀況OK，明天可以做基礎重訓；如果腿很痠，就改上半身、伸展或低強度有氧。減脂不是每天硬衝，是持續出席。";
  }

  return `我會用穩定赤字來看，不走極端。你今天攝取 ${formatNumber(totals.calories)} kcal、蛋白質 ${formatNumber(totals.protein)}g，接下來優先補蛋白質和蔬菜，再依剩餘熱量安排主食。`;
}

function buildCoachPrompt(question) {
  const totals = getTotals();
  const target = activeTarget();
  const remaining = target.calories - totals.calories + totals.exercise;

  return `
使用者設定：
- 女性，身高159cm，起始體重99kg，目標一年到65kg
- 可彈性搭配168，不強制斷食
- 有氧＋重訓，每週約4次
- 膝蓋需避免高衝擊運動
- 豆漿容易脹氣，不要優先推薦豆漿
- 偏好高蛋白飲、雞肉、飯、地瓜、超商食物、外食可執行方案
- 核心任務：建立 adherence 長期執行能力，不是假設每天都有動力

今日狀態：
- 日型：${state.dayType}
- 六階段狀態：${stages[state.stage]?.label || stages.discipline.label}
- 今日習慣分數：${getHabitScore()} / 100
- 今日體重：${state.body.weight || "未填"} kg
- 腰圍：${state.body.waist || "未填"} cm
- 睡眠：${state.body.sleepHours || "未填"} 小時
- 飢餓感：${state.body.hungerLevel || "未填"} / 5
- 精神：${state.body.energyLevel || "未填"} / 5
- 膝蓋狀況：${state.body.kneeStatus || "未填"}
- 小腿狀況：${state.body.calfSoreness || "未填"}
- 身體備註：${state.body.bodyNote || "未填"}
- 目標熱量：${target.calories} kcal
- 今日攝取：${formatNumber(totals.calories)} kcal
- 剩餘估算：${formatNumber(remaining)} kcal
- 蛋白質：${formatNumber(totals.protein)} / ${proteinTarget} g
- 碳水：${formatNumber(totals.carbs)} / ${target.carbs} g
- 脂肪：${formatNumber(totals.fat)} g
- 運動消耗：${formatNumber(totals.exercise)} kcal
- 飲食紀錄：${state.foods.map((food) => `${food.mealType} ${food.foodName} ${food.calories}kcal P${food.protein} C${food.carbs} F${food.fat}`).join("；") || "尚無"}
- 運動紀錄：${state.exercises.map((exercise) => `${exercise.exerciseType} ${exercise.duration}分鐘 ${exercise.caloriesBurned}kcal 膝蓋:${exercise.kneeStatus || "未填"} 小腿:${exercise.calfSoreness || "未填"} ${exercise.note || ""}`).join("；") || "尚無"}
- 今日最低標準：${stages[state.stage]?.minimum || stages.discipline.minimum}

使用者問題：${question}

請用繁體中文回答。語氣像朋友陪跑，但要專業。不要羞辱，不要恐嚇，不要極端節食，不要把食物絕對禁止。當她狀態差時啟動最低標準模式；當她失誤時提醒下一餐回正軌即可。請算數字、做判斷、給下一步。回覆控制在 180 字內。
`.trim();
}

async function askOpenAICoach(question) {
  if (!aiSettings.apiKey && location.protocol.startsWith("http")) {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiSettings.model || "gpt-4.1-mini",
        prompt: buildCoachPrompt(question),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.reply || null;
    }
  }

  if (!aiSettings.apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: aiSettings.model || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "你是一位女性減脂陪跑AI教練。你協助使用者穩定減脂，避免極端節食，回覆要自然、務實、溫柔、有界線。",
        },
        {
          role: "user",
          content: buildCoachPrompt(question),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  const outputText = data.output_text;
  const nestedText = data.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text)
    ?.filter(Boolean)
    ?.join("\n");

  return outputText || nestedText || null;
}

async function answerCoachQuestion(question, button) {
  addChatMessage(question, "user");
  const fallbackReply = coachReply(question);
  const waitingMessage = addChatMessage("我看一下今天的紀錄，幫你抓一個穩的答案...");

  if (button) {
    button.disabled = true;
  }

  try {
    const reply = await askOpenAICoach(question);
    waitingMessage.textContent = reply || fallbackReply;
    $("#aiStatus").textContent = reply ? "已使用 AI 教練回覆" : "目前使用本機陪跑回覆";
  } catch {
    waitingMessage.textContent = fallbackReply;
    $("#aiStatus").textContent = "AI 連線沒有成功，已切回本機回覆";
  } finally {
    if (button) {
      button.disabled = false;
    }
    $("#chatWindow").scrollTop = $("#chatWindow").scrollHeight;
  }
}

function render() {
  const totals = getTotals();
  const target = activeTarget();
  const remaining = target.calories - totals.calories + totals.exercise;
  const calorieRatio = Math.min(totals.calories / target.calories, 1);
  const circumference = 465;
  const missionDay = getMissionDay();

  $("#todayLabel").textContent = new Intl.DateTimeFormat("zh-TW", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
  $("#comicDayNumber").textContent = missionDay;
  $("#missionDayPill").textContent = `第 ${missionDay} 天`;

  $("#dayType").value = state.dayType;
  $("#stageSelect").value = state.stage;
  $("#calorieTotal").textContent = formatNumber(totals.calories);
  $("#calorieTarget").textContent = `/ ${target.calories} kcal`;
  $("#remainingCalories").textContent = `${formatNumber(remaining)} kcal`;
  $("#exerciseCalories").textContent = `${formatNumber(totals.exercise)} kcal`;
  $("#calorieRing").style.strokeDashoffset = circumference - circumference * calorieRatio;
  $("#proteinText").textContent = `${formatNumber(totals.protein)} / ${proteinTarget} g`;
  $("#carbsText").textContent = `${formatNumber(totals.carbs)} / ${target.carbs} g`;
  $("#fatText").textContent = `${formatNumber(totals.fat)} g`;
  $("#proteinProgress").value = Math.min(totals.protein, proteinTarget);
  $("#carbsProgress").max = target.carbs;
  $("#carbsProgress").value = Math.min(totals.carbs, target.carbs);
  $("#fatProgress").value = Math.min(totals.fat, fatTarget);
  $("#dailyAdvice").textContent = generateAdvice();
  $("#stageName").textContent = stages[state.stage]?.label || stages.discipline.label;
  $("#stageReminder").textContent = stages[state.stage]?.reminder || stages.discipline.reminder;
  $("#minimumStandard").textContent = stages[state.stage]?.minimum || stages.discipline.minimum;
  $("#habitScore").textContent = getHabitScore();
  Object.entries(state.habits).forEach(([key, value]) => {
    const field = $("#habitForm").elements[key];
    if (field) {
      field.checked = value;
    }
  });
  Object.entries(state.body).forEach(([key, value]) => {
    const field = $("#bodyForm").elements[key];
    if (field) {
      field.value = value;
    }
  });
  $$(".quick-group").forEach((group) => {
    const field = group.dataset.field;
    group.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-selected", String(state.body[field] ?? "") === button.dataset.value);
    });
  });
  $("#proteinRate").textContent = `${Math.min(Math.round((totals.protein / proteinTarget) * 100), 100)}%`;
  $("#exerciseCount").textContent = state.exercises.length;
  if ($("#quickWeightForm")) {
    $("#quickWeightForm").elements.weight.value = state.body.weight || "";
  }
  $("#aiSettingsForm").elements.model.value = aiSettings.model || "gpt-4.1-mini";
  $("#aiSettingsForm").elements.apiKey.value = aiSettings.apiKey || "";
  $("#aiStatus").textContent = aiSettings.apiKey ? "已儲存 API key，送出問題會嘗試 OpenAI" : "目前使用本機陪跑回覆";
  $("#gasCodeBlock").textContent = gasCode;
  setGasStatus("GAS 已固定綁定。換裝置後直接開網站就能同步，也可以手動推送/讀取。");

  renderRecords();
  renderSummary();
  renderWeightChart();
  renderCalorieTrendChart();
  renderTrendsFoodRecords();
  renderHistorySummary();
  renderGrowth();
}

function renderRecords() {
  const foodRecords = $("#foodRecords");
  const exerciseRecords = $("#exerciseRecords");

  foodRecords.innerHTML = state.foods.length
    ? state.foods
        .map(
          (food) => `
          <article class="record-card">
            <span>${escapeHtml(food.mealType)}</span>
            <strong>${escapeHtml(food.foodName)}</strong>
            <p>${formatNumber(food.calories)} kcal · 蛋白質 ${formatNumber(food.protein)}g · 碳水 ${formatNumber(food.carbs)}g · 脂肪 ${formatNumber(food.fat)}g</p>
          </article>
        `,
        )
        .join("")
    : '<div class="empty-state">今天還沒有飲食紀錄。</div>';

  exerciseRecords.innerHTML = state.exercises.length
    ? state.exercises
        .map(
          (exercise) => `
          <article class="record-card">
            <span>${escapeHtml(exercise.exerciseType)}</span>
            <strong>${exercise.duration} 分鐘 · ${formatNumber(exercise.caloriesBurned)} kcal</strong>
            <p>${exercise.heartRate ? `平均心率 ${escapeHtml(exercise.heartRate)} · ` : ""}${escapeHtml(exercise.note || "身體狀態未填寫")}</p>
          </article>
        `,
        )
        .join("")
    : '<div class="empty-state">今天還沒有運動紀錄。</div>';
}

function renderSummary() {
  const totals = getTotals();
  const target = activeTarget();
  const deficit = target.calories + totals.exercise - totals.calories;
  const lines = [
    ["今日總熱量", `${formatNumber(totals.calories)} kcal`],
    ["蛋白質", `${formatNumber(totals.protein)} g`],
    ["碳水", `${formatNumber(totals.carbs)} g`],
    ["脂肪", `${formatNumber(totals.fat)} g`],
    ["運動消耗", `${formatNumber(totals.exercise)} kcal`],
    ["今日赤字估算", `${formatNumber(deficit)} kcal`],
    ["今日體重", state.body.weight ? `${state.body.weight} kg` : "未填"],
    ["睡眠/恢復", state.body.sleepHours ? `${state.body.sleepHours} 小時` : "未填"],
    ["膝蓋/小腿", `${state.body.kneeStatus || "未填"} / ${state.body.calfSoreness || "未填"}`],
    ["習慣分數", `${getHabitScore()} / 100`],
    ["目前階段", stages[state.stage]?.label || stages.discipline.label],
  ];

  $("#dailySummary").innerHTML = `
    ${lines.map(([label, value]) => `<div class="summary-line"><span>${label}</span><strong>${value}</strong></div>`).join("")}
    <div class="tip-box">
      <strong>明日建議</strong>
      <p>${generateAdvice()} 記得，核心不是完美，是不管發生什麼都能回到軌道上。</p>
    </div>
  `;
}

function renderGrowth() {
  const grid = $("#stageGrid");
  if (!grid) {
    return;
  }

  grid.innerHTML = Object.entries(stages)
    .map(
      ([key, stage]) => `
        <article class="stage-card ${state.stage === key ? "is-current" : ""}">
          <span>${escapeHtml(stage.task)}</span>
          <strong>${escapeHtml(stage.label)}</strong>
          <p>${escapeHtml(stage.reminder)}</p>
        </article>
      `,
    )
    .join("");
}

function renderWeightChart() {
  const chart = $("#weightChart");
  if (!chart) {
    return;
  }
  const recent = weights.slice(-8);

  if (!recent.length) {
    chart.innerHTML = '<div class="empty-state">加入體重後會顯示曲線。</div>';
    return;
  }

  const max = Math.max(...recent.map((item) => item.weight));
  const min = Math.min(...recent.map((item) => item.weight));
  const range = Math.max(max - min, 1);

  chart.innerHTML = recent
    .map((item) => {
      const height = 36 + ((item.weight - min) / range) * 120;
      return `
        <article class="trend-point" title="${item.date} · ${item.weight}kg">
          <span class="trend-value">${item.weight}</span>
          <div class="trend-bar" style="height:${height}px"></div>
          <small>${item.date.slice(5)}</small>
        </article>
      `;
    })
    .join("");
}

function getRecentCalorieSeries() {
  const fromHistory = historyRecords
    .filter((item) => Number(item.calories) > 0)
    .map((item) => ({ date: item.date, calories: Number(item.calories) }));
  const todayTotals = getTotals();
  const existingTodayIndex = fromHistory.findIndex((item) => item.date === todayKey);

  if (todayTotals.calories > 0) {
    const todayEntry = { date: todayKey, calories: todayTotals.calories };
    if (existingTodayIndex >= 0) {
      fromHistory[existingTodayIndex] = todayEntry;
    } else {
      fromHistory.push(todayEntry);
    }
  }

  return fromHistory.slice(-7);
}

function renderCalorieTrendChart() {
  const chart = $("#calorieTrendChart");
  if (!chart) {
    return;
  }

  const recent = getRecentCalorieSeries();
  if (!recent.length) {
    chart.innerHTML = '<div class="empty-state">記錄熱量後，這裡會出現最近 7 天變化。</div>';
    return;
  }

  const max = Math.max(...recent.map((item) => item.calories), 1800);
  chart.innerHTML = recent
    .map((item) => {
      const height = Math.max(24, (item.calories / max) * 112);
      const label = `${item.date.slice(5)} · ${formatNumber(item.calories)} kcal`;
      return `<span title="${escapeHtml(label)}" style="height:${height}px"><small>${escapeHtml(item.date.slice(5))}</small></span>`;
    })
    .join("");
}

function renderTrendsFoodRecords() {
  const list = $("#trendsFoodRecords");
  if (!list) {
    return;
  }

  list.innerHTML = state.foods.length
    ? state.foods
        .map(
          (food) => `
          <article class="record-card">
            <span>${escapeHtml(food.mealType)}</span>
            <strong>${escapeHtml(food.foodName)}</strong>
            <p>${formatNumber(food.calories)} kcal · 蛋白質 ${formatNumber(food.protein)}g · 碳水 ${formatNumber(food.carbs)}g · 脂肪 ${formatNumber(food.fat)}g</p>
          </article>
        `,
        )
        .join("")
    : '<div class="empty-state">今天的飲食記錄會顯示在這裡。</div>';
}

function activateTab(tabId) {
  $$(".tab-button").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.tab === tabId);
  });
  $$(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === tabId);
  });
}

function renderHistorySummary() {
  const recordsWithCalories = getRecentCalorieSeries().length
    ? historyRecords
        .filter((item) => Number(item.calories) > 0)
        .map((item) => ({ ...item, calories: Number(item.calories) }))
    : [];
  const todayTotals = getTotals();
  if (todayTotals.calories > 0) {
    const existingTodayCalories = recordsWithCalories.findIndex((item) => item.date === todayKey);
    const mergedToday = { date: todayKey, calories: todayTotals.calories };
    if (existingTodayCalories >= 0) {
      recordsWithCalories[existingTodayCalories] = { ...recordsWithCalories[existingTodayCalories], ...mergedToday };
    } else {
      recordsWithCalories.push(mergedToday);
    }
  }

  const recordsWithWeight = historyRecords
    .filter((item) => Number(item.weight) > 0)
    .map((item) => ({ ...item, weight: Number(item.weight) }));
  if (state.body.weight) {
    const currentWeight = { date: todayKey, weight: Number(state.body.weight) };
    const existingTodayWeight = recordsWithWeight.findIndex((item) => item.date === todayKey);
    if (existingTodayWeight >= 0) {
      recordsWithWeight[existingTodayWeight] = currentWeight;
    } else {
      recordsWithWeight.push(currentWeight);
    }
  }
  const latestWeight = recordsWithWeight.at(-1);
  const averageCalories =
    recordsWithCalories.reduce((total, item) => total + Number(item.calories), 0) /
    Math.max(recordsWithCalories.length, 1);

  const latestNode = $("#historyLatestWeight");
  const averageNode = $("#historyAverageCalories");
  const chart = $("#historyChart");

  if (!latestNode || !averageNode || !chart) {
    return;
  }

  latestNode.textContent = latestWeight ? `${latestWeight.weight} kg` : "-- kg";
  averageNode.textContent = recordsWithCalories.length ? `${formatNumber(averageCalories)} kcal` : "-- kcal";

  const recent = recordsWithCalories.slice(-10);
  if (!recent.length) {
    chart.innerHTML = '<div class="empty-state">最近沒有可顯示的熱量資料。</div>';
    return;
  }
  const max = Math.max(...recent.map((item) => item.calories), 1800);
  chart.innerHTML = recent
    .map((item) => {
      const height = Math.max(20, (Number(item.calories) / max) * 112);
      const label = `${item.date.slice(5)} · ${item.calories}kcal`;
      return `<span title="${escapeHtml(label)}" style="height:${height}px"><small>${escapeHtml(item.date.slice(5))}</small></span>`;
    })
    .join("");
}

function addChatMessage(text, role = "coach") {
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;
  message.textContent = text;
  $("#chatWindow").append(message);
  $("#chatWindow").scrollTop = $("#chatWindow").scrollHeight;
  return message;
}

function setupEvents() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
    });
  });

  $$(".jump-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(`.tab-button[data-tab="${button.dataset.targetTab}"]`);
      target?.click();
    });
  });

  $("#dayType").addEventListener("change", (event) => {
    state.dayType = event.target.value;
    saveState();
    render();
  });

  $("#stageSelect").addEventListener("change", (event) => {
    state.stage = event.target.value;
    saveState();
    render();
  });

  $("#habitForm").addEventListener("change", () => {
    const data = new FormData($("#habitForm"));
    state.habits = {
      water: data.has("water"),
      noSugaryDrink: data.has("noSugaryDrink"),
      recovery: data.has("recovery"),
    };
    saveState();
    render();
  });

  $$(".quick-group button").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.closest(".quick-group").dataset.field;
      state.body[field] = button.dataset.value;
      saveState();
      $("#bodyStatus").textContent = "已暫存，按儲存會同步體重趨勢。";
      render();
    });
  });

  $("#bodyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.body = {
      ...state.body,
      weight: data.get("weight"),
      waist: data.get("waist"),
    };
    saveState();
    saveTodayWeight(state.body.weight);
    $("#bodyStatus").textContent = "今日身體紀錄已儲存。";
    render();
  });

  $("#foodForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const foodName = data.get("foodName").trim();
    const estimate = estimateFood(foodName);
    const food = {
      id: createId(),
      mealType: data.get("mealType"),
      foodName,
      calories: Number(data.get("calories")) || estimate.calories,
      protein: Number(data.get("protein")) || estimate.protein,
      carbs: Number(data.get("carbs")) || estimate.carbs,
      fat: Number(data.get("fat")) || estimate.fat,
    };

    state.foods.push(food);
    saveState();
    $("#foodEstimate").textContent = `這餐先估 ${formatNumber(food.calories)} kcal，蛋白質 ${formatNumber(food.protein)}g、碳水 ${formatNumber(food.carbs)}g、脂肪 ${formatNumber(food.fat)}g。你可以在送出前手動修正數字。`;
    event.currentTarget.reset();
    calorieDraft = "";
    shouldReplaceCalorieDraft = false;
    updateCalorieDisplay();
    render();
  });

  $$(".quick-calculator-grid button").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.quickCalKey;

      if (/^\d+$/.test(key)) {
        if (shouldReplaceQuickCalorieDraft) {
          quickCalorieDraft = "";
          shouldReplaceQuickCalorieDraft = false;
        }
        if (key === "100") {
          quickCalorieDraft = quickCalorieDraft && !quickCalorieDraft.endsWith("+")
            ? `${quickCalorieDraft}+100`
            : `${quickCalorieDraft}100`;
        } else {
          quickCalorieDraft = `${quickCalorieDraft}${key}`.replace(/^0+(\d)/, "$1");
        }
      } else if (key === "+") {
        shouldReplaceQuickCalorieDraft = false;
        if (quickCalorieDraft && !quickCalorieDraft.endsWith("+")) {
          quickCalorieDraft += "+";
        }
      } else if (key === "back") {
        quickCalorieDraft = quickCalorieDraft.slice(0, -1);
        shouldReplaceQuickCalorieDraft = false;
      } else if (key === "clear") {
        quickCalorieDraft = "";
        shouldReplaceQuickCalorieDraft = false;
      } else if (key === "done") {
        addQuickCalories();
        return;
      }

      updateQuickCalorieDisplay();
    });
  });

  $$(".calculator-grid button").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.calKey;

      if (/^\d+$/.test(key)) {
        if (shouldReplaceCalorieDraft) {
          calorieDraft = "";
          shouldReplaceCalorieDraft = false;
        }
        calorieDraft = `${calorieDraft}${key}`.replace(/^0+(\d)/, "$1");
      } else if (key === "+") {
        shouldReplaceCalorieDraft = false;
        if (calorieDraft && !calorieDraft.endsWith("+")) {
          calorieDraft += "+";
        }
      } else if (key === "back") {
        calorieDraft = calorieDraft.slice(0, -1);
        shouldReplaceCalorieDraft = false;
      } else if (key === "clear") {
        calorieDraft = "";
        shouldReplaceCalorieDraft = false;
      } else if (key === "estimate") {
        applyEstimateToFoodForm();
        return;
      } else if (key === "done") {
        fillCaloriesFromDraft();
      }

      updateCalorieDisplay();
    });
  });

  $$(".macro-chip-row button").forEach((button) => {
    button.addEventListener("click", () => {
      addMacroPreset(button.dataset.macroPreset);
    });
  });

  $("#recognizeText").addEventListener("click", applyEstimateToFoodForm);

  $("#foodPhoto").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await recognizeFoodPhoto(file);
    } catch {
      $("#recognitionStatus").textContent = "照片辨識沒有成功，先用文字描述餐點再按辨識。";
    } finally {
      event.target.value = "";
    }
  });

  $("#exerciseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const exerciseType = data.get("exerciseType");
    const duration = Number(data.get("duration"));
    const caloriesBurned = Number(data.get("caloriesBurned")) || estimateExercise(exerciseType, duration);

    state.exercises.push({
      id: createId(),
      exerciseType,
      duration,
      caloriesBurned,
      heartRate: data.get("heartRate"),
      kneeStatus: data.get("kneeStatus").trim(),
      calfSoreness: data.get("calfSoreness").trim(),
      note: data.get("note").trim(),
    });
    saveState();
    event.currentTarget.reset();
    render();
  });

  $("#coachForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const question = data.get("question").trim();
    const submitButton = event.currentTarget.querySelector("button");
    await answerCoachQuestion(question, submitButton);
    event.currentTarget.reset();
  });

  $$(".quick-prompts > button").forEach((button) => {
    button.addEventListener("click", async () => {
      await answerCoachQuestion(button.textContent, button);
    });
  });

  $("#aiSettingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    aiSettings = {
      apiKey: data.get("apiKey").trim(),
      model: data.get("model").trim() || "gpt-4.1-mini",
    };
    saveAiSettings();
    $("#aiStatus").textContent = aiSettings.apiKey ? "設定已儲存" : "目前使用本機陪跑回覆";
  });

  $("#applyFixedGas").addEventListener("click", () => {
    gasSettings = { gasUrl: fixedGasUrl };
    saveGasSettings();
    setGasStatus("固定 GAS 已套用，正在推送目前資料...");
    pushToGas().catch(() => setGasStatus("GAS 推送失敗，請確認部署權限是 Anyone。"));
  });

  $("#pushGas").addEventListener("click", () => {
    pushToGas().catch(() => setGasStatus("GAS 推送失敗，請確認連結與部署權限。"));
  });

  $("#pullGas").addEventListener("click", () => {
    pullFromGas().catch(() => setGasStatus("GAS 讀取失敗，請確認連結與部署權限。"));
  });

  $("#copyGasCode").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(gasCode);
      setGasStatus("GAS 程式碼已複製。");
    } catch {
      setGasStatus("無法自動複製，請手動選取程式碼。");
    }
  });

  $("#weightForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const weight = data.get("weight");
    state.body.weight = weight;
    saveState();
    saveTodayWeight(weight);
    event.currentTarget.reset();
    render();
  });

  $("#quickWeightForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const weight = data.get("weight");
    state.body.weight = weight;
    saveState();
    saveTodayWeight(weight);
    const status = $("#quickWeightStatus");
    if (status) {
      status.textContent = `已儲存 ${weight} kg。`;
    }
    render();
  });

  $("#clearToday").addEventListener("click", () => {
    state = { ...defaultState };
    saveState();
    render();
  });

  $("#exportData").addEventListener("click", () => {
    exportAllData();
    $("#backupStatus").textContent = "備份檔已匯出。";
  });

  $("#importData").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await importAllData(file);
      $("#backupStatus").textContent = "備份已還原。";
    } catch {
      $("#backupStatus").textContent = "備份檔讀取失敗，請確認檔案是否正確。";
    } finally {
      event.target.value = "";
    }
  });

  $("#applyRickyMeals").addEventListener("click", applyRickyMeals);
  $("#applyRickyWorkout").addEventListener("click", applyRickyWorkout);

  $("#installApp").addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      setGasStatus("iPhone 用 Safari 的分享選單加入主畫面；Android 用 Chrome 選單安裝 App。");
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("#installApp").hidden = true;
  });
}

function setupInstallSupport() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    $("#installApp").hidden = false;
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

setupInstallSupport();
setupEvents();
addChatMessage("嗨，我會用份量和平衡來陪你，不會把食物貼上禁止標籤。今天想先問晚餐，還是先記一餐？");
render();
renderHistorySummary();
