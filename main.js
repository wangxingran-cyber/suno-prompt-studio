const $ = (id) => document.getElementById(id);

const sourceLabels = {
  official: "Official",
  community: "Community",
  inferred: "Inferred",
  custom: "Custom"
};

const categoryIcons = {
  Genre: "G",
  Mood: "M",
  Instrument: "I",
  Vocal: "V",
  Production: "P",
  Structure: "S",
  Tempo: "T",
  Harmony: "H",
  Era: "E",
  Custom: "+"
};

let promptLibrary = [];
let presetLibrary = [];
let userPresetLibrary = [];
const selected = new Set(["Cool jazz", "Acoustic guitar", "Minimalist", "Clean"]);
const categoryVisibility = new Map();
let activeDeck = "style";
let exactBpm = false;
let promptOutputVisible = false;
let activeOptionCategory = "Genre";
const USER_PRESET_KEY = "sunoPromptStudio.v4.userPresets";

function normalize(text) {
  return String(text || "").toLowerCase().trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function escHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHaystack(entry, includeSongs = false) {
  const base = `${entry.prompt} ${entry.zh} ${entry.category} ${(entry.pair || []).join(" ")}`;
  return normalize(includeSongs ? `${base} ${(entry.songs || []).join(" ")}` : base);
}

function showToast(message) {
  const toast = $("toastV3");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

async function loadData() {
  const data = await fetch("./app.js").then((response) => {
    if (!response.ok) throw new Error(`Cannot load app.js: ${response.status}`);
    return response.json();
  });
  promptLibrary = Array.isArray(data.promptLibrary) ? data.promptLibrary : [];
  presetLibrary = Array.isArray(data.presetLibrary) ? data.presetLibrary : [];
  userPresetLibrary = loadUserPresets();
  promptLibrary.forEach((entry) => {
    if (!categoryVisibility.has(entry.category)) categoryVisibility.set(entry.category, true);
  });
  if (!categories().includes(activeOptionCategory)) activeOptionCategory = categories()[0] || "";
}

function loadUserPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_PRESET_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((preset) => preset && typeof preset.name === "string")
      : [];
  } catch {
    return [];
  }
}

function persistUserPresets() {
  localStorage.setItem(USER_PRESET_KEY, JSON.stringify(userPresetLibrary));
}

function categories() {
  return unique(promptLibrary.map((entry) => entry.category));
}

function selectedEntries() {
  return promptLibrary.filter((entry) => selected.has(entry.prompt));
}

function tempoDescriptor(value) {
  const bpm = Number(value);
  if (bpm < 60) return "very slow tempo";
  if (bpm < 90) return "slow tempo";
  if (bpm < 120) return "mid-tempo";
  if (bpm < 150) return "upbeat tempo";
  if (bpm < 190) return "fast tempo";
  return "extreme fast tempo";
}

function tempoPrompt() {
  const fader = $("bpmFader");
  const bpm = fader.value;
  const min = Number(fader.min || 40);
  const max = Number(fader.max || 260);
  const position = ((Number(bpm) - min) / (max - min)) * 100;
  fader.style.setProperty("--bpm-pos", `${position}%`);
  return exactBpm ? `${bpm} bpm` : tempoDescriptor(bpm);
}

function suggestedExcludes(entries) {
  const prompts = entries.map((entry) => normalize(entry.prompt));
  const has = (name) => prompts.includes(normalize(name));
  const excludes = entries.flatMap((entry) => entry.avoid || []);
  if (has("Cool jazz") || has("Minimalist") || has("Clean")) excludes.push("heavy distortion", "aggressive EDM drop", "muddy mix");
  if (has("Acoustic") || has("Acoustic guitar") || has("Folk")) excludes.push("hard synth lead", "dubstep drop", "metal drums");
  if (has("Lo-fi") || has("Chill") || has("Mellow")) excludes.push("overly bright mix", "shouting vocals", "fast aggressive drums");
  if (has("Cinematic") || has("Orchestral")) excludes.push("cheap synth brass", "flat loop", "thin strings");
  if (has("Pop") || has("Catchy")) excludes.push("atonal melody", "unclear chorus");
  return unique(excludes).slice(0, 12);
}

function qualityNotes(entries) {
  const notes = [];
  const prompts = entries.map((entry) => normalize(entry.prompt));
  const has = (name) => prompts.includes(normalize(name));
  if (entries.length >= 4 && entries.length <= 8) notes.push({ type: "good", text: `${entries.length} tags selected, stable for Suno style control.` });
  if (entries.length > 8) notes.push({ text: `${entries.length} tags may over-constrain generation. Keep the strongest 4-8 tags.` });
  if (entries.length < 3) notes.push({ text: "Add at least one instrument or mood tag for better control." });
  if ((has("Acoustic") || has("Acoustic guitar")) && (has("EDM") || has("Dubstep") || has("Trap"))) notes.push({ text: "Acoustic and heavy electronic directions are both present. Use intentionally or remove one side." });
  if ((has("Slow") || has("Mellow")) && (has("Fast") || has("Aggressive"))) notes.push({ text: "Slow/mellow and fast/aggressive cues conflict. Exclude the side you do not want." });
  if (!entries.some((entry) => ["Instrument", "Vocal"].includes(entry.category))) notes.push({ text: "No instrument or vocal cue yet. Add piano, acoustic guitar, female vocals, etc." });
  if (!notes.length) notes.push({ type: "good", text: "No obvious conflict. Ready to copy." });
  return notes;
}

function renderPresetOptions() {
  const builtin = presetLibrary.map((preset) => `<option value="builtin:${escHtml(preset.name)}">${escHtml(preset.name)}</option>`).join("");
  const custom = userPresetLibrary.map((preset) => `<option value="user:${escHtml(preset.name)}">★ ${escHtml(preset.name)}</option>`).join("");
  $("presetSelect").innerHTML = `<option value="">Preset</option>${builtin}${custom ? `<optgroup label="Saved">${custom}</optgroup>` : ""}`;
}

function renderCategoryOptions() {
  const options = `<option value="all">All categories</option>${categories().sort().map((category) => `<option value="${escHtml(category)}">${escHtml(category)}</option>`).join("")}`;
  $("categoryFilterV3").innerHTML = options;
}

function renderCategoryControls() {
  const cats = categories();
  const shown = cats.filter((category) => categoryVisibility.get(category) !== false).length;
  $("visibleCategoryCount").textContent = `${shown} shown`;
  $("categoryControls").innerHTML = cats.map((category) => {
    const visible = categoryVisibility.get(category) !== false;
    return `
      <section class="category-card ${category === activeOptionCategory ? "active" : ""}" data-category-card="${escHtml(category)}">
        <div class="category-title">
          <span class="category-icon">${categoryIcons[category] || "•"}</span>
          <span>${escHtml(category)}</span>
        </div>
        <button class="show-switch ${visible ? "show" : "hide"}" data-category="${escHtml(category)}" type="button" aria-pressed="${visible}">
          <span class="switch-label left">Show</span>
          <span class="switch-label right">Hide</span>
          <span class="switch-knob">${visible ? "Show" : "Hide"}</span>
        </button>
      </section>
    `;
  }).join("");

  document.querySelectorAll(".category-card").forEach((card) => {
    card.addEventListener("click", () => {
      activeOptionCategory = card.dataset.categoryCard;
      renderAll();
    });
  });

  document.querySelectorAll(".show-switch").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const category = button.dataset.category;
      categoryVisibility.set(category, !(categoryVisibility.get(category) !== false));
      activeOptionCategory = category;
      renderAll();
    });
  });
}

function visibleEntriesForStyle() {
  const query = normalize($("chipSearchV3").value);
  return promptLibrary.filter((entry) => {
    if (entry.category !== activeOptionCategory) return false;
    if (categoryVisibility.get(entry.category) === false) return false;
    return !query || buildHaystack(entry).includes(query);
  });
}

function renderLanes() {
  const grouped = {};
  selectedEntries().forEach((entry) => {
    grouped[entry.category] ||= [];
    grouped[entry.category].push(entry);
  });

  const cats = categories().filter((category) => grouped[category]?.length);
  $("selectedLaneList").innerHTML = cats.length ? cats.map((category) => {
    const entries = grouped[category];
    return `
    <section class="lane" data-category="${escHtml(category)}">
      <div class="lane-head">
        <strong>${categoryIcons[category] || "•"} ${escHtml(category)}</strong>
        <span>${entries.length} selected</span>
      </div>
      <div class="lane-chips">
        ${entries.map((entry) => `
          <div class="prompt-chip selected" data-prompt="${escHtml(entry.prompt)}">
            <span>${escHtml(entry.prompt)}</span>
            <button class="chip-remove" data-remove="${escHtml(entry.prompt)}" type="button" aria-label="Remove ${escHtml(entry.prompt)}">×</button>
          </div>
        `).join("")}
      </div>
    </section>
  `}).join("") : `
    <section class="lane">
      <div class="lane-head"><strong>Empty Cart</strong><span>0 selected</span></div>
      <div class="lane-chips"><span class="empty-hint">Select options on the right to assemble your Style Prompt.</span></div>
    </section>
  `;

  document.querySelectorAll(".chip-remove").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selected.delete(button.dataset.remove);
      renderAll();
    });
  });
}

function renderOptions() {
  const entries = visibleEntriesForStyle();
  const visible = categoryVisibility.get(activeOptionCategory) !== false;
  $("activeOptionCategoryLabel").textContent = `${activeOptionCategory || "Category"} options${visible ? "" : " - hidden"}`;
  $("optionList").innerHTML = entries.length ? entries.map((entry) => `
    <button class="option-card ${selected.has(entry.prompt) ? "selected" : ""}" data-option="${escHtml(entry.prompt)}" type="button">
      <span>${escHtml(entry.prompt)}</span>
      <small>${escHtml(entry.zh || "")}</small>
    </button>
  `).join("") : `
    <div class="option-empty">${visible ? "No options match the current search." : "This category is hidden. Turn Show on to browse options."}</div>
  `;

  document.querySelectorAll(".option-card").forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.option;
      if (selected.has(prompt)) selected.delete(prompt);
      else selected.add(prompt);
      renderAll();
    });
  });
}

function renderInspector() {
  const entries = selectedEntries();
  const tempo = tempoPrompt();
  const styleParts = entries.map((entry) => entry.prompt);
  if (tempo) styleParts.push(tempo);
  $("styleOutputV3").value = styleParts.join(", ");
  $("excludeOutputV3").value = suggestedExcludes(entries).join(", ");
  $("qualityListV3").innerHTML = qualityNotes(entries).map((note) => `<div class="quality-item ${note.type === "good" ? "good" : ""}">${escHtml(note.text)}</div>`).join("");
  $("styleSummary").textContent = `${entries.length} tags`;
  $("promptOutputPanel").classList.toggle("hidden", !promptOutputVisible);
  $("showPromptBtn").textContent = promptOutputVisible ? "Hide Prompt" : "Show Prompt";
}

function renderLibrary() {
  const query = normalize($("librarySearchV3").value);
  const category = $("categoryFilterV3").value || "all";
  const source = $("sourceFilterV3").value || "all";
  const rows = promptLibrary.filter((entry) => {
    return (!query || buildHaystack(entry, true).includes(query))
      && (category === "all" || entry.category === category)
      && (source === "all" || entry.source === source);
  });
  $("libraryStatsV3").textContent = `${rows.length} / ${promptLibrary.length}`;
  $("librarySummary").textContent = `${promptLibrary.length} terms`;
  $("libraryRowsV3").innerHTML = rows.map((entry) => `
    <tr>
      <td>${escHtml(entry.prompt)}<br><small>${escHtml(entry.category)} · ${escHtml(sourceLabels[entry.source] || entry.source)}</small></td>
      <td>${escHtml(entry.zh || "")}</td>
      <td>${(entry.songs || []).slice(0, 3).map(escHtml).join("<br>")}</td>
      <td><button class="add-from-library" data-prompt="${escHtml(entry.prompt)}" type="button">${selected.has(entry.prompt) ? "Remove" : "Add"}</button></td>
    </tr>
  `).join("");

  document.querySelectorAll(".add-from-library").forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.prompt;
      if (selected.has(prompt)) selected.delete(prompt);
      else selected.add(prompt);
      renderAll();
    });
  });
}

function lyricLines({ type, lang, theme, story, scene, keywords, vocal, avoid }) {
  const styleLine = $("styleOutputV3").value.trim();
  const draft = $("lyricsDraftV3").value.trim();
  const blocks = [];
  if (styleLine) blocks.push(`[Style Notes]\n${styleLine}`);
  if (vocal) blocks.push(`[Vocal / Mood]\n${vocal}`);
  if (theme) blocks.push(`[Feeling]\n${theme}`);
  if (story) blocks.push(`[Story]\n${story}`);
  if (scene) blocks.push(`[Scene]\n${scene}`);
  if (keywords) blocks.push(`[Keywords]\n${keywords}`);
  if (draft) blocks.push(draft);
  if (avoid) blocks.push(`[Exclude]\n${avoid}`);
  if (blocks.length) return blocks.join("\n\n");
  return "";
}


function generateLyrics() {
  const values = {
    type: $("songTypeV3").value,
    lang: $("lyricLanguageV3").value,
    theme: $("themeV3").value.trim().slice(0, 200),
    story: $("storyV3").value.trim().slice(0, 240),
    scene: $("sceneV3").value.trim().slice(0, 200),
    keywords: $("keywordsV3").value.trim().slice(0, 200),
    vocal: $("vocalV3").value.trim().slice(0, 120),
    avoid: $("avoidV3").value.trim().slice(0, 200)
  };
  $("lyricsOutputV3").value = lyricLines(values);
  const label = values.type === "instrumental" ? "Instrumental" : values.type === "hook" ? "Hook" : "Vocal";
  const langMap = { zh: "ZH", en: "EN", bilingual: "ZH/EN", ja: "JA", ko: "KO", pt: "PT", es: "ES", ja_en: "JA/EN", ko_en: "KO/EN" };
  const lang = langMap[values.lang] || values.lang.toUpperCase();
  $("lyricsSummary").textContent = `${label} - ${lang}`;
}

function sectionContent(text, tag) {
  const pattern = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\n\\s*\\[[^\\]]+\\]|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function validateCompletionInputs() {
  const missing = [];
  if (!$("themeV3").value.trim()) missing.push("感受");
  if (!$("storyV3").value.trim()) missing.push("故事");
  if (!$("sceneV3").value.trim()) missing.push("场景");

  const draft = $("lyricsDraftV3").value;
  if (!sectionContent(draft, "Verse")) missing.push("[Verse] 内容");
  if (!sectionContent(draft, "Chorus")) missing.push("[Chorus] 内容");

  return missing;
}

function completeLyrics() {
  const missing = validateCompletionInputs();
  const rule = $("completionRule");
  if (missing.length) {
    rule.textContent = `暂不补全：请先填写 ${missing.join("、")}。`;
    rule.classList.add("warn");
    rule.classList.remove("good");
    showToast("信息不足，暂不补全。");
    return;
  }
  generateLyrics();
  rule.textContent = "已满足补全条件：感受、故事、场景、Verse、Chorus 均有内容。";
  rule.classList.add("good");
  rule.classList.remove("warn");
  showToast("已补全。");
}

function insertStructureTag(tag) {
  const area = $("lyricsDraftV3");
  const block = `[${tag}]\n`;
  const start = area.selectionStart ?? area.value.length;
  const end = area.selectionEnd ?? area.value.length;
  const before = area.value.slice(0, start);
  const after = area.value.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
  const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
  area.value = `${before}${prefix}${block}${suffix}${after}`;
  const next = (before + prefix + block).length;
  area.focus();
  area.setSelectionRange(next, next);
  generateLyrics();
}

function addCustomPrompt() {
  const raw = $("customPromptV3").value.trim();
  const prompt = raw.replace(/[^a-zA-Z0-9 \-]/g, "").replace(/\s+/g, " ").trim();
  if (!prompt) return showToast("Use English letters, numbers, spaces, and hyphens only.");
  if (!promptLibrary.some((entry) => entry.prompt.toLowerCase() === prompt.toLowerCase())) {
    promptLibrary.push({
      prompt,
      zh: "Custom English prompt",
      category: "Custom",
      source: "custom",
      count: 0,
      songs: ["Custom reference needed", "Custom reference needed", "Custom reference needed"],
      pair: ["user-defined"]
    });
    categoryVisibility.set("Custom", true);
    renderCategoryOptions();
  }
  selected.add(prompt);
  $("customPromptV3").value = "";
  renderAll();
}

async function copyText(id) {
  const value = $(id).value || $(id).textContent || "";
  if (!value.trim()) return showToast("Nothing to copy.");
  await navigator.clipboard.writeText(value);
  showToast("Copied.");
}

function setDeck(deck) {
  activeDeck = deck;
  $("deckShell").dataset.active = deck;
  document.querySelectorAll(".deck").forEach((item) => {
    item.classList.toggle("active", item.dataset.deck === deck);
    item.classList.toggle("collapsed", item.dataset.deck !== deck);
  });
}

function renderTempo() {
  const bpm = $("bpmFader").value;
  $("tempoReadout").textContent = `${bpm} bpm · ${tempoDescriptor(bpm)}`;
  const button = $("exactBpmSwitch");
  button.classList.toggle("on", exactBpm);
  button.classList.toggle("off", !exactBpm);
  button.setAttribute("aria-pressed", String(exactBpm));
  button.querySelector(".switch-label.right").textContent = exactBpm ? "On" : "Off";
  button.querySelector(".switch-knob").textContent = exactBpm ? "On" : "Off";
}

function renderAll() {
  renderCategoryControls();
  renderLanes();
  renderOptions();
  renderTempo();
  renderInspector();
  renderLibrary();
  generateLyrics();
}

function currentPresetState(name) {
  return {
    name,
    prompts: [...selected],
    bpm: Number($("bpmFader").value),
    exactBpm,
    categories: Object.fromEntries([...categoryVisibility.entries()]),
    activeOptionCategory
  };
}

function saveCurrentPreset() {
  const fallback = `Preset ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
  const name = window.prompt("Preset name", fallback);
  if (!name || !name.trim()) return;
  const cleanName = name.trim().slice(0, 48);
  const next = currentPresetState(cleanName);
  const index = userPresetLibrary.findIndex((preset) => preset.name.toLowerCase() === cleanName.toLowerCase());
  if (index >= 0) userPresetLibrary[index] = next;
  else userPresetLibrary.push(next);
  persistUserPresets();
  renderPresetOptions();
  $("presetSelect").value = `user:${cleanName}`;
  showToast("Preset saved");
}

function applyPreset(preset) {
  selected.clear();
  (Array.isArray(preset.prompts) ? preset.prompts : [])
    .filter((prompt) => typeof prompt === "string")
    .forEach((prompt) => selected.add(prompt));
  if (typeof preset.bpm === "number") $("bpmFader").value = String(preset.bpm);
  if (typeof preset.exactBpm === "boolean") exactBpm = preset.exactBpm;
  if (preset.categories) {
    Object.entries(preset.categories).forEach(([category, visible]) => {
      categoryVisibility.set(category, Boolean(visible));
    });
  }
  if (preset.activeOptionCategory && categories().includes(preset.activeOptionCategory)) {
    activeOptionCategory = preset.activeOptionCategory;
  }
  renderAll();
}

function bindEvents() {
  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => setDeck(button.dataset.open));
  });

  $("presetSelect").addEventListener("change", () => {
    const value = $("presetSelect").value;
    const [scope, ...nameParts] = value.split(":");
    const name = nameParts.join(":");
    const preset = scope === "user"
      ? userPresetLibrary.find((item) => item.name === name)
      : presetLibrary.find((item) => item.name === name);
    if (!preset) return;
    applyPreset(preset);
  });

  $("savePresetBtn").addEventListener("click", saveCurrentPreset);
  $("copyStyleBtn").addEventListener("click", () => copyText("styleOutputV3"));
  $("copyExcludeBtn").addEventListener("click", () => copyText("excludeOutputV3"));
  $("copyLyricsBtn").addEventListener("click", () => copyText("lyricsOutputV3"));
  $("clearBtn").addEventListener("click", () => {
    selected.clear();
    renderAll();
  });

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copyTarget));
  });

  $("showPromptBtn").addEventListener("click", () => {
    promptOutputVisible = !promptOutputVisible;
    renderInspector();
  });
  $("chipSearchV3").addEventListener("input", renderOptions);
  $("librarySearchV3").addEventListener("input", renderLibrary);
  $("categoryFilterV3").addEventListener("change", renderLibrary);
  $("sourceFilterV3").addEventListener("change", renderLibrary);
  $("addCustomBtnV3").addEventListener("click", addCustomPrompt);
  $("customPromptV3").addEventListener("keydown", (event) => {
    if (event.key === "Enter") addCustomPrompt();
  });
  $("bpmFader").addEventListener("input", () => {
    renderTempo();
    renderInspector();
  });
  $("exactBpmSwitch").addEventListener("click", () => {
    exactBpm = !exactBpm;
    renderTempo();
    renderInspector();
  });
  document.querySelectorAll("#structureButtons button").forEach((button) => {
    button.addEventListener("click", () => insertStructureTag(button.dataset.tag));
  });
  ["songTypeV3", "lyricLanguageV3", "themeV3", "storyV3", "sceneV3", "keywordsV3", "vocalV3", "avoidV3", "lyricsDraftV3"].forEach((id) => {
    $(id).addEventListener("input", generateLyrics);
    $(id).addEventListener("change", generateLyrics);
  });
  $("generateLyricsV3").addEventListener("click", completeLyrics);
}

loadData()
  .then(() => {
    renderPresetOptions();
    renderCategoryOptions();
    bindEvents();
    setDeck(activeDeck);
    renderAll();
  })
  .catch((error) => {
    console.error(error);
    showToast("数据加载失败");
  });
