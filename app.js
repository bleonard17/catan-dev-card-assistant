(() => {
  "use strict";

  const ICONS = window.CATAN_ICONS || {};
  const TOTAL_CARDS = 25;
  const CARD_TYPES = [
    { id: "knight", name: "Knight", short: "KNT", total: 14, icon: ICONS.knight },
    { id: "monopoly", name: "Monopoly", short: "MON", total: 2, icon: ICONS.monopoly },
    { id: "year-of-plenty", name: "Year of Plenty", short: "YOP", total: 2, icon: ICONS.yearOfPlenty },
    { id: "road-building", name: "Road Building", short: "ROAD", total: 2, icon: ICONS.roadBuilding },
    { id: "victory-point", name: "Victory Point", short: "VP", total: 5, icon: ICONS.victoryPoint }
  ];

  const freshState = () => ({
    drawn: 0,
    known: Object.fromEntries(CARD_TYPES.map(card => [card.id, 0]))
  });

  let state = freshState();
  let previousRemaining = TOTAL_CARDS;
  let celebrationTimer = null;
  const history = [];

  const els = {
    cardsRemaining: document.getElementById("cardsRemaining"),
    deckRingText: document.getElementById("deckRingText"),
    drawnCount: document.getElementById("drawnCount"),
    knownCount: document.getElementById("knownCount"),
    hiddenCount: document.getElementById("hiddenCount"),
    unknownDrawBtn: document.getElementById("unknownDrawBtn"),
    unknownDrawIcon: document.getElementById("unknownDrawIcon"),
    undoBtn: document.getElementById("undoBtn"),
    resetBtn: document.getElementById("resetBtn"),
    cardRows: document.getElementById("cardRows"),
    helpBtn: document.getElementById("helpBtn"),
    helpPanel: document.getElementById("helpPanel"),
    statusText: document.getElementById("statusText"),
    deckCard: document.querySelector(".deck-card"),
    deckCelebration: document.getElementById("deckCelebration")
  };

  if (ICONS.devCard) els.unknownDrawIcon.src = ICONS.devCard;
  else els.unknownDrawIcon.style.display = "none";

  function cloneState(value) {
    return { drawn: value.drawn, known: { ...value.known } };
  }

  function knownTotal() {
    return Object.values(state.known).reduce((sum, n) => sum + n, 0);
  }

  function hiddenCount() { return state.drawn - knownTotal(); }
  function physicalRemaining() { return TOTAL_CARDS - state.drawn; }
  function unseenPoolSize() { return TOTAL_CARDS - knownTotal(); }

  function probabilityFor(card) {
    if (physicalRemaining() <= 0) return 0;
    const unseenOfType = card.total - state.known[card.id];
    const unseenPool = unseenPoolSize();
    return unseenPool > 0 ? unseenOfType / unseenPool : 0;
  }

  function expectedInDeck(card) {
    if (physicalRemaining() <= 0) return 0;
    const unseenOfType = card.total - state.known[card.id];
    const unseenPool = unseenPoolSize();
    if (unseenPool <= 0) return 0;
    return unseenOfType * physicalRemaining() / unseenPool;
  }

  function pushHistory(label) {
    history.push({ state: cloneState(state), label });
    if (history.length > 100) history.shift();
  }

  function setStatus(message) { els.statusText.textContent = message; }

  function recordUnknownDraw() {
    if (state.drawn >= TOTAL_CARDS) return;
    pushHistory("Opponent bought a hidden dev card");
    state.drawn += 1;
    setStatus("Opponent dev card recorded");
    render();
  }

  function recordKnownDraw(cardId) {
    const card = CARD_TYPES.find(c => c.id === cardId);
    if (!card || state.drawn >= TOTAL_CARDS || state.known[cardId] >= card.total) return;
    pushHistory(`Drew ${card.name}`);
    state.drawn += 1;
    state.known[cardId] += 1;
    setStatus(`${card.name} draw recorded`);
    render();
  }

  function revealHiddenCard(cardId) {
    const card = CARD_TYPES.find(c => c.id === cardId);
    if (!card || hiddenCount() <= 0 || state.known[cardId] >= card.total) return;
    pushHistory(`Played ${card.name}`);
    state.known[cardId] += 1;
    setStatus(`${card.name} identified from a hidden draw`);
    render();
  }

  function undo() {
    const previous = history.pop();
    if (!previous) return;
    state = previous.state;
    setStatus(`Undid: ${previous.label}`);
    render();
  }

  function resetGame() {
    const hasActivity = state.drawn > 0 || knownTotal() > 0;
    if (hasActivity && !window.confirm("Reset this game? All counters will return to zero.")) return;
    state = freshState();
    history.length = 0;
    previousRemaining = TOTAL_CARDS;
    setStatus("Fresh game · no data is saved");
    hideCelebration();
    render();
  }

  function formatPercent(value) { return `${(value * 100).toFixed(1)}%`; }
  function formatExpected(value) { return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1); }

  function iconMarkup(card) {
    if (card.icon) {
      return `<img class="card-art" src="${card.icon}" alt="" aria-hidden="true" />`;
    }
    return `<span class="card-fallback" aria-hidden="true">${card.short}</span>`;
  }

  function rowMarkup(card) {
    const known = state.known[card.id];
    const probability = probabilityFor(card);
    const expected = expectedInDeck(card);
    const barPct = Math.max(0, Math.min(100, (expected / card.total) * 100));
    const canDraw = state.drawn < TOTAL_CARDS && known < card.total;
    const canReveal = hiddenCount() > 0 && known < card.total;
    const exhausted = known >= card.total;

    return `
      <article class="card-row${exhausted ? " exhausted" : ""}" data-card-id="${card.id}">
        <span class="card-art-wrap">${iconMarkup(card)}</span>
        <div class="card-info">
          <div class="card-name">${card.name}</div>
          <div class="card-sub">${known} known of ${card.total}</div>
        </div>
        <div class="probability">
          <strong>${formatPercent(probability)}</strong>
          <span>next draw</span>
        </div>
        <div class="estimate">
          <div class="estimate-line">
            <span>Est. in deck</span>
            <span class="estimate-count">${formatExpected(expected)} / ${card.total}</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" style="width:${barPct}%"></div>
          </div>
        </div>
        <div class="row-actions">
          <button class="secondary-btn drew-btn" type="button" data-action="draw" data-card-id="${card.id}" ${canDraw ? "" : "disabled"} title="You drew a known ${card.name}">Drew</button>
          <button class="secondary-btn played" type="button" data-action="played" data-card-id="${card.id}" ${canReveal ? "" : "disabled"} title="An opponent played or revealed a previously hidden ${card.name}">Played</button>
        </div>
      </article>
    `;
  }

  function celebrateDeckEmpty() {
    clearTimeout(celebrationTimer);
    els.deckCelebration.hidden = false;
    els.deckCard.classList.remove("deck-empty-flash");
    void els.deckCard.offsetWidth;
    els.deckCard.classList.add("deck-empty-flash");
    celebrationTimer = setTimeout(hideCelebration, 2000);
  }

  function hideCelebration() {
    clearTimeout(celebrationTimer);
    if (els.deckCelebration) els.deckCelebration.hidden = true;
    if (els.deckCard) els.deckCard.classList.remove("deck-empty-flash");
  }

  function render() {
    const remaining = physicalRemaining();
    const known = knownTotal();
    const hidden = hiddenCount();
    const remainingPct = remaining / TOTAL_CARDS;

    els.cardsRemaining.textContent = remaining;
    els.drawnCount.textContent = state.drawn;
    els.knownCount.textContent = known;
    els.hiddenCount.textContent = hidden;
    els.deckRingText.textContent = `${Math.round(remainingPct * 100)}%`;
    document.documentElement.style.setProperty("--deck-angle", `${remainingPct * 360}deg`);

    els.unknownDrawBtn.disabled = state.drawn >= TOTAL_CARDS;
    if (state.drawn >= TOTAL_CARDS) {
      els.unknownDrawBtn.querySelector(".primary-btn-title").textContent = "Dev Deck Empty";
      els.unknownDrawBtn.querySelector(".primary-btn-subtitle").textContent = "All 25 cards have been drawn";
      els.unknownDrawBtn.querySelector(".primary-btn-plus").textContent = "✓";
    } else {
      els.unknownDrawBtn.querySelector(".primary-btn-title").textContent = "Opponent Bought a Dev Card";
      els.unknownDrawBtn.querySelector(".primary-btn-subtitle").textContent = "Card type is still hidden";
      els.unknownDrawBtn.querySelector(".primary-btn-plus").textContent = "+1";
    }

    els.undoBtn.disabled = history.length === 0;
    els.cardRows.innerHTML = CARD_TYPES.map(rowMarkup).join("");

    if (remaining === 0 && previousRemaining > 0) celebrateDeckEmpty();
    previousRemaining = remaining;
  }

  els.unknownDrawBtn.addEventListener("click", recordUnknownDraw);
  els.undoBtn.addEventListener("click", undo);
  els.resetBtn.addEventListener("click", resetGame);

  els.helpBtn.addEventListener("click", () => {
    const willOpen = els.helpPanel.hidden;
    els.helpPanel.hidden = !willOpen;
    els.helpBtn.setAttribute("aria-expanded", String(willOpen));
  });

  els.cardRows.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const cardId = button.dataset.cardId;
    if (button.dataset.action === "draw") recordKnownDraw(cardId);
    if (button.dataset.action === "played") revealHiddenCard(cardId);
  });

  render();
})();
