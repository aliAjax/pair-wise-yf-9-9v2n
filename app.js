const storageKey = "zfl18-boardgame-rule-cards";
const tonightLimitMinutes = 180;
const today = new Date();

const defaultState = {
  selectedId: "",
  attendees: "",
  queuedIds: [],
  playlistConfirmed: false,
  sessions: [],
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
  playlistView: document.querySelector("#playlistView"),
  playlistStatus: document.querySelector("#playlistStatus")
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

function getQueuedGames() {
  return state.queuedIds
    .map((id) => state.games.find((game) => game.id === id))
    .filter(Boolean);
}

function isFitting(game, attendees) {
  return attendees >= game.minPlayers && attendees <= game.maxPlayers;
}

function getPlaylistStats() {
  const attendees = Number(state.attendees);
  const queued = getQueuedGames();
  if (!attendees) {
    return { attendees: 0, queued, fitting: [], mismatched: [], total: 0 };
  }
  const fitting = queued.filter((game) => isFitting(game, attendees));
  const mismatched = queued.filter((game) => !isFitting(game, attendees));
  const total = fitting.reduce((sum, game) => sum + game.duration, 0);
  return { attendees, queued, fitting, mismatched, total };
}

function getAvailableGames() {
  const attendees = Number(state.attendees);
  return state.games
    .filter((game) => !state.queuedIds.includes(game.id) && isFitting(game, attendees))
    .sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderPlaylistBuilder() {
  const { attendees, queued, mismatched, total } = getPlaylistStats();
  const remaining = tonightLimitMinutes - total;
  const options = attendees ? getAvailableGames() : [];
  const overflow = state.playlistOverflow;
  const canConfirm = queued.some((game) => isFitting(game, attendees));

  els.playlistStatus.textContent = "排桌中";
  els.playlistView.innerHTML = `
    <div class="playlist-builder">
      <div class="playlist-top">
        <label class="attendee-field">
          今晚到场人数
          <input id="attendeesInput" type="number" min="1" max="12" inputmode="numeric"
            value="${state.attendees}" placeholder="先填人数" />
        </label>
        <div class="playlist-stats ${remaining < 0 ? "over" : ""}">
          <div>
            <span>合适的桌</span>
            <strong>${queued.length - mismatched.length} 盒</strong>
          </div>
          <div>
            <span>合计时长</span>
            <strong>${total} 分钟</strong>
          </div>
          <div>
            <span>三小时内还剩</span>
            <strong>${remaining < 0 ? `超 ${Math.abs(remaining)}` : remaining} 分钟</strong>
          </div>
        </div>
      </div>

      ${
        overflow
          ? `<p class="playlist-warning">⚠ ${escapeHtml(overflow)}</p>`
          : remaining < 0
            ? `<p class="playlist-warning">⚠ 已排时长超过三小时，请挪走任意一盒。</p>`
            : ""
      }

      ${renderSessions()}

      <div class="queue-block">
        <h3>今晚顺序</h3>
        ${
          queued.length
            ? `<ol class="queue-list">
                ${queued
                  .map((game, index) => {
                    const bad = attendees > 0 && !isFitting(game, attendees);
                    return `
                      <li class="queue-item ${bad ? "mismatch" : ""}">
                        <div class="queue-info">
                          <span class="queue-index">${index + 1}</span>
                          <div>
                            <strong>${escapeHtml(game.name)}</strong>
                            <span class="game-meta">
                              <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                              <span class="pill ${bad ? "" : "counted"}">${game.duration}分钟${bad ? "（不计入）" : ""}</span>
                              ${bad ? `<span class="pill bad">不适合 ${attendees || "？"} 人</span>` : ""}
                            </span>
                          </div>
                        </div>
                        <div class="queue-actions">
                          <button type="button" data-action="up" data-index="${index}" ${index === 0 ? "disabled" : ""}>↑</button>
                          <button type="button" data-action="down" data-index="${index}" ${index === queued.length - 1 ? "disabled" : ""}>↓</button>
                          <button type="button" data-action="remove" data-index="${index}">挪走</button>
                        </div>
                      </li>
                    `;
                  })
                  .join("")}
              </ol>`
            : `<p class="empty">还没排，先填人数再从下面挑合适的收藏。</p>`
        }
        ${
          mismatched.length
            ? `<p class="mismatch-note">有 ${mismatched.length} 盒不适合当前人数，已标出且不计入时长。</p>`
            : ""
        }
      </div>

      <div class="add-block">
        <label>
          挑选收藏加入（只显示适合且未排的）
          <select id="availableSelect" ${!attendees || !options.length ? "disabled" : ""}>
            ${
              !attendees
                ? `<option>先填到场人数</option>`
                : options.length
                  ? options
                      .map(
                        (game) =>
                          `<option value="${game.id}">${escapeHtml(game.name)}（${game.minPlayers}-${game.maxPlayers}人 · ${game.duration}分钟 · ${daysSince(game.lastPlayed)}天未玩）</option>`
                      )
                      .join("")
                  : `<option>没有可加入的桌游了</option>`
            }
          </select>
        </label>
        <div class="playlist-actions">
          <button class="primary" type="button" id="addToQueueBtn" ${!attendees || !options.length ? "disabled" : ""}>加入桌单</button>
          <button type="button" id="confirmPlaylistBtn" ${canConfirm ? "" : "disabled"}>确认桌单</button>
        </div>
      </div>
    </div>
  `;
}

function renderSessions() {
  if (!state.sessions.length) return "";
  return `
    <div class="sessions">
      <h3>最近场次</h3>
      <ul class="session-list">
        ${state.sessions
          .map(
            (session) => `
              <li>
                <span>${session.date} · ${session.attendees} 人</span>
                <span>${escapeHtml(session.games.join("、")) || "未玩桌游"}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

function renderMiniRules(title, items, tone) {
  return `
    <div class="mini-rules ${tone}">
      <h4>${title}</h4>
      <ul>
        ${items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : `<li>暂无记录。</li>`}
      </ul>
    </div>
  `;
}

function renderPlaylistConfirmed() {
  const { attendees, fitting, mismatched, total } = getPlaylistStats();
  els.playlistStatus.textContent = "已确认";
  els.playlistView.innerHTML = `
    <div class="playlist-confirmed">
      <div class="confirmed-head">
        <p class="eyebrow">今晚就按这个顺序来</p>
        <p class="game-meta">${attendees} 人 · ${fitting.length} 盒 · 合计 ${total} 分钟${total > tonightLimitMinutes ? "（已超三小时）" : ""}</p>
        <button type="button" data-action="reopen">还想调整</button>
      </div>
      <ol class="confirmed-list">
        ${fitting
          .map(
            (game, index) => `
              <li class="confirmed-item">
                <h3><span class="queue-index">${index + 1}</span>${escapeHtml(game.name)}</h3>
                <div class="mini-rules-grid">
                  ${renderMiniRules("容易忘的规则", game.forgets, "forget")}
                  ${renderMiniRules("常见争议", game.disputes, "dispute")}
                </div>
              </li>
            `
          )
          .join("")}
      </ol>
      ${
        mismatched.length
          ? `<p class="mismatch-note">${escapeHtml(mismatched.map((game) => game.name).join("、"))} 不适合 ${attendees} 人，已留在桌单外，不计入今晚时长。</p>`
          : ""
      }
      ${
        state.endingNight
          ? `
            <form class="end-night" id="endNightForm">
              <label>
                今晚实际参与人数
                <input id="actualAttendeesInput" type="number" min="1" max="12" inputmode="numeric" value="${attendees}" />
              </label>
              <div class="playlist-actions">
                <button class="primary" type="submit">保存并清空桌单</button>
                <button type="button" data-action="cancelEnd">取消</button>
              </div>
            </form>
          `
          : `<div class="playlist-actions">
              <button class="primary" type="button" id="endNightBtn">今晚结束</button>
            </div>`
      }
    </div>
  `;
}

function renderPlaylist() {
  if (state.playlistConfirmed) renderPlaylistConfirmed();
  else renderPlaylistBuilder();
}

function renderAll() {
  // 收藏被删除后，清理桌单里的悬空引用
  const liveIds = new Set(state.games.map((game) => game.id));
  if (state.queuedIds.some((id) => !liveIds.has(id))) {
    state.queuedIds = state.queuedIds.filter((id) => liveIds.has(id));
  }
  saveState();
  renderSummary();
  renderList();
  renderDetail();
  const attendeesWasFocused = document.activeElement?.id === "attendeesInput";
  renderPlaylist();
  if (attendeesWasFocused) {
    const attendeesInput = document.querySelector("#attendeesInput");
    if (attendeesInput) {
      attendeesInput.focus();
      attendeesInput.setSelectionRange(attendeesInput.value.length, attendeesInput.value.length);
    }
  }
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

setDefaultDate();

els.playlistView.addEventListener("input", (event) => {
  if (event.target.id !== "attendeesInput") return;
  state.attendees = event.target.value;
  state.playlistOverflow = "";
  renderAll();
});

els.playlistView.addEventListener("click", (event) => {
  const addButton = event.target.closest("#addToQueueBtn");
  const confirmButton = event.target.closest("#confirmPlaylistBtn");
  const endButton = event.target.closest("#endNightBtn");
  const actionButton = event.target.closest("[data-action]");

  if (addButton) {
    const select = document.querySelector("#availableSelect");
    const game = state.games.find((item) => item.id === select?.value);
    const attendees = Number(state.attendees);
    if (!game || !attendees) return;
    const { total } = getPlaylistStats();
    const nextTotal = total + game.duration;
    if (nextTotal > tonightLimitMinutes) {
      state.playlistOverflow = `放不下：加入《${game.name}》（${game.duration}分钟）后合计 ${nextTotal} 分钟，超过三小时。换一盒短的，或挪走桌上任意一盒。`;
      renderAll();
      return;
    }
    state.playlistOverflow = "";
    state.queuedIds.push(game.id);
    renderAll();
    return;
  }

  if (confirmButton) {
    const { fitting } = getPlaylistStats();
    if (!fitting.length) return;
    state.playlistConfirmed = true;
    state.endingNight = false;
    state.playlistOverflow = "";
    renderAll();
    return;
  }

  if (endButton) {
    state.endingNight = true;
    renderPlaylist();
    return;
  }

  if (!actionButton) return;
  const { action } = actionButton.dataset;
  const index = Number(actionButton.dataset.index);

  if (action === "up" || action === "down") {
    const target = action === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= state.queuedIds.length) return;
    [state.queuedIds[index], state.queuedIds[target]] = [state.queuedIds[target], state.queuedIds[index]];
    state.playlistOverflow = "";
    renderAll();
  }

  if (action === "remove") {
    state.queuedIds.splice(index, 1);
    state.playlistOverflow = "";
    renderAll();
  }

  if (action === "reopen") {
    state.playlistConfirmed = false;
    state.endingNight = false;
    renderAll();
  }

  if (action === "cancelEnd") {
    state.endingNight = false;
    renderPlaylist();
  }
});

els.playlistView.addEventListener("submit", (event) => {
  if (event.target.id !== "endNightForm") return;
  event.preventDefault();
  const { attendees, fitting } = getPlaylistStats();
  const input = document.querySelector("#actualAttendeesInput");
  const actual = Number(input?.value) || attendees;
  if (!actual) return;
  const todayString = new Date().toISOString().slice(0, 10);
  state.sessions.unshift({ date: todayString, attendees: actual, games: fitting.map((game) => game.name) });
  state.sessions = state.sessions.slice(0, 12);
  fitting.forEach((game) => {
    game.lastPlayed = todayString;
  });
  state.queuedIds = [];
  state.playlistConfirmed = false;
  state.endingNight = false;
  state.playlistOverflow = "";
  renderAll();
});

renderAll();
