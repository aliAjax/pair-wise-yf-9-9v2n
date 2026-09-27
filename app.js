const storageKey = "zfl18-boardgame-rule-cards";
const tonightLimit = 180;
const today = new Date();

const defaultState = {
  selectedId: "",
  tonight: { players: 4, queue: [], confirmed: false },
  records: [],
  games: [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
      setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
      disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
      setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"]
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
      disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
    }
  ]
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

let tonightWarning = "";
let finishingTonight = false;

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount"),
  tonightPanel: document.querySelector("#tonightPanel"),
  tonightPlayers: document.querySelector("#tonightPlayers"),
  tonightTotal: document.querySelector("#tonightTotal"),
  tonightMeter: document.querySelector("#tonightMeter"),
  tonightWarning: document.querySelector("#tonightWarning"),
  tonightRecord: document.querySelector("#tonightRecord"),
  tonightActions: document.querySelector("#tonightActions"),
  tonightColumns: document.querySelector("#tonightColumns"),
  tonightCandidates: document.querySelector("#tonightCandidates"),
  tonightQueue: document.querySelector("#tonightQueue"),
  tonightReview: document.querySelector("#tonightReview")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getAllRules(game) {
  return [...game.forgets, ...game.disputes, ...game.setup, ...game.scoring];
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function isSuitableFor(game, players) {
  return players >= game.minPlayers && players <= game.maxPlayers;
}

function getQueuedGames() {
  return state.tonight.queue
    .map((id) => state.games.find((game) => game.id === id))
    .filter(Boolean);
}

function getTonightTotal() {
  return getQueuedGames()
    .filter((game) => isSuitableFor(game, state.tonight.players))
    .reduce((sum, game) => sum + game.duration, 0);
}

function renderTonight() {
  state.tonight.queue = state.tonight.queue.filter((id) => state.games.some((game) => game.id === id));
  const players = state.tonight.players;
  const queued = getQueuedGames();
  const suitable = queued.filter((game) => isSuitableFor(game, players));
  const total = suitable.reduce((sum, game) => sum + game.duration, 0);

  els.tonightPlayers.value = players;
  els.tonightTotal.textContent = total;
  els.tonightMeter.style.width = `${Math.min(100, (total / tonightLimit) * 100)}%`;
  els.tonightWarning.hidden = !tonightWarning;
  els.tonightWarning.textContent = tonightWarning;

  const last = state.records[state.records.length - 1];
  els.tonightRecord.textContent = last
    ? `上次聚会 ${last.date} · ${last.players}人 · ${last.games.join("、") || "未记录桌游"}`
    : "";

  if (!state.tonight.confirmed) {
    els.tonightColumns.hidden = false;
    els.tonightReview.innerHTML = "";
    els.tonightActions.innerHTML = `<button id="confirmTonightBtn" class="primary" type="button">确认桌单</button>`;
    renderTonightCandidates(players);
    renderTonightQueue(queued, players);
    return;
  }

  els.tonightColumns.hidden = true;
  els.tonightActions.innerHTML = finishingTonight
    ? `
      <form id="finishForm" class="finish-form">
        <label>
          实际参与人数
          <input id="actualPlayersInput" type="number" min="1" max="12" value="${players}" required />
        </label>
        <button class="primary" type="submit">记录并清空</button>
        <button id="cancelFinishBtn" type="button">取消</button>
      </form>
    `
    : `
      <button id="editTonightBtn" type="button">重新调整</button>
      <button id="finishTonightBtn" class="primary" type="button">结束今晚</button>
    `;
  renderTonightReview(queued, suitable);
}

function renderTonightCandidates(players) {
  const candidates = state.games.filter(
    (game) => isSuitableFor(game, players) && !state.tonight.queue.includes(game.id)
  );
  els.tonightCandidates.innerHTML =
    candidates
      .map(
        (game) => `
        <div class="tonight-item">
          <div class="tonight-item-info">
            <strong>${escapeHtml(game.name)}</strong>
            <div class="game-meta">
              <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
              <span class="pill">${game.duration}分钟</span>
            </div>
          </div>
          <button type="button" data-add-id="${game.id}">加入</button>
        </div>
      `
      )
      .join("") || `<p class="empty">当前人数没有可加入的收藏。</p>`;
}

function renderTonightQueue(queued, players) {
  els.tonightQueue.innerHTML =
    queued
      .map((game, index) => {
        const suitable = isSuitableFor(game, players);
        return `
        <div class="tonight-item ${suitable ? "" : "mismatch"}">
          <span class="order">${index + 1}</span>
          <div class="tonight-item-info">
            <strong>${escapeHtml(game.name)}</strong>
            <div class="game-meta">
              <span class="pill">${game.duration}分钟</span>
              ${suitable ? "" : `<span class="pill warn">人数不合适，不计时长</span>`}
            </div>
          </div>
          <div class="item-actions">
            <button type="button" title="上移" data-move="${index}:-1" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" title="下移" data-move="${index}:1" ${index === queued.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" data-remove-index="${index}">挪走</button>
          </div>
        </div>
      `;
      })
      .join("") || `<p class="empty">还没排桌游，从左边加入。</p>`;
}

function renderTonightReview(queued, suitable) {
  const skipped = queued.length - suitable.length;
  els.tonightReview.innerHTML = `
    <div class="review">
      <h3>今晚复习清单（按桌单顺序）</h3>
      ${skipped ? `<p class="tonight-note">${skipped} 盒因人数不合适已跳过，不计入清单。</p>` : ""}
      ${suitable
        .map(
          (game, index) => `
        <section class="rule-section">
          <h3>${index + 1}. ${escapeHtml(game.name)}（${game.duration}分钟）</h3>
          <div class="review-grid">
            <div>
              <h4>容易忘的规则</h4>
              <ul>${game.forgets.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>暂无</li>"}</ul>
            </div>
            <div>
              <h4>常见争议</h4>
              <ul>${game.disputes.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>暂无</li>"}</ul>
            </div>
          </div>
        </section>
      `
        )
        .join("")}
    </div>
  `;
}

function tryAddToTonight(gameId) {
  const game = state.games.find((item) => item.id === gameId);
  if (!game) return;
  const total = getTonightTotal();
  if (total + game.duration > tonightLimit) {
    tonightWarning = `再加《${game.name}》就到 ${total + game.duration} 分钟，超过 3 小时放不下了。`;
  } else {
    state.tonight.queue.push(gameId);
    tonightWarning = "";
  }
  renderAll();
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
  renderTonight();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: ["本局开始前先补充容易忘的规则。"],
    disputes: [],
    setup: ["整理组件并按人数调整初始设置。"],
    scoring: ["确认终局计分项和即时得分项。"]
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(text);
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

els.tonightPlayers.addEventListener("change", () => {
  const players = Math.max(1, Math.min(12, Number(els.tonightPlayers.value) || 1));
  state.tonight.players = players;
  state.tonight.confirmed = false;
  finishingTonight = false;
  tonightWarning = "";
  renderAll();
});

els.tonightPanel.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-id]");
  const moveButton = event.target.closest("[data-move]");
  const removeButton = event.target.closest("[data-remove-index]");

  if (addButton) {
    tryAddToTonight(addButton.dataset.addId);
    return;
  }

  if (moveButton) {
    const [index, delta] = moveButton.dataset.move.split(":").map(Number);
    const target = index + delta;
    const queue = state.tonight.queue;
    if (target < 0 || target >= queue.length) return;
    [queue[index], queue[target]] = [queue[target], queue[index]];
    tonightWarning = "";
    renderAll();
    return;
  }

  if (removeButton) {
    state.tonight.queue.splice(Number(removeButton.dataset.removeIndex), 1);
    tonightWarning = "";
    renderAll();
    return;
  }

  if (event.target.closest("#confirmTonightBtn")) {
    const hasSuitable = getQueuedGames().some((game) => isSuitableFor(game, state.tonight.players));
    if (!hasSuitable) {
      tonightWarning = "桌单里还没有适合当前人数的桌游。";
      renderAll();
      return;
    }
    state.tonight.confirmed = true;
    tonightWarning = "";
    renderAll();
    return;
  }

  if (event.target.closest("#editTonightBtn")) {
    state.tonight.confirmed = false;
    finishingTonight = false;
    renderAll();
    return;
  }

  if (event.target.closest("#finishTonightBtn")) {
    finishingTonight = true;
    renderAll();
    return;
  }

  if (event.target.closest("#cancelFinishBtn")) {
    finishingTonight = false;
    renderAll();
  }
});

els.tonightPanel.addEventListener("submit", (event) => {
  if (event.target.id !== "finishForm") return;
  event.preventDefault();
  const actual = Math.max(
    1,
    Math.min(12, Number(document.querySelector("#actualPlayersInput").value) || state.tonight.players)
  );
  const played = getQueuedGames()
    .filter((game) => isSuitableFor(game, state.tonight.players))
    .map((game) => game.name);
  state.records.push({ date: new Date().toISOString().slice(0, 10), players: actual, games: played });
  state.tonight = { players: actual, queue: [], confirmed: false };
  finishingTonight = false;
  tonightWarning = "";
  renderAll();
});

setDefaultDate();
renderAll();
