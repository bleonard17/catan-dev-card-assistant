(() => {
  "use strict";

  const ICONS = window.CATAN_ICONS || {};
  const TOTAL_CARDS = 25;
  const LOW_DECK_THRESHOLD = 5;

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
    deckCard: document.querySelector(".deck-card"),
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
    deckCelebration: document.getElementById("deckCelebration")
  };

  if (els.unknownDrawIcon && ICONS.devCard) {
    els.unknownDrawIcon.src = ICONS.devCard;
  }

  function cloneState(value) {
    return { drawn: value.drawn, known: { ...value.known } };
  }

  function knownTotal() {
    return Object.values(state.known).reduce((sum, n) => sum + n, 0);
  }

  function hiddenCount() {
    return state.drawn - knownTotal();
  }

  function physicalRemaining() {
    return TOTAL_CARDS - state.drawn;
  }

  function unseenPoolSize() {
    return TOTAL_CARDS - knownTotal();
  }

  function probabilityFor(card) {
    if (physicalRemaining() <= 0) return 0;
    const unseenOfType = card.total - state.known[card.id];
    const unseenPool = unseenPoolSize();
    return unseenPool > 0 ? unseenOfType / unseenPool : 0;
  }

  function pushHistory(label) {
    history.push({ state: cloneState(state), label });
    if (history.length > 100) history.shift();
  }

  function setStatus(message) {
    els.statusText.textContent = message;
  }

  function recordUnknownDraw() {
    if (state.drawn >= TOTAL_CARDS) return;
    pushHistory("Dev bought");
    state.drawn += 1;
    setStatus("Hidden dev recorded");
    render();
  }

  function recordKnownDraw(cardId) {
    const card = CARD_TYPES.find(c => c.id === cardId);
    if (!card || state.drawn >= TOTAL_CARDS || state.known[cardId] >= card.total) return;

    pushHistory(`Drew ${card.name}`);
    state.drawn += 1;
    state.known[cardId] += 1;
    setStatus(`${card.name} drawn`);
    render();
  }

  function revealHiddenCard(cardId) {
    const card = CARD_TYPES.find(c => c.id === cardId);
    if (!card || hiddenCount() <= 0 || state.known[cardId] >= card.total) return;

    pushHistory(`Played ${card.name}`);
    state.known[cardId] += 1;
    setStatus(`${card.name} revealed`);
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
    previousRemaining = TOTAL_CARDS;
    history.length = 0;
    hideCelebration();
    setStatus("Fresh game · no data is saved");
    render();
  }

  function formatPercent(value) {
    return value === 0 ? "0%" : `${(value * 100).toFixed(1)}%`;
  }

  function showCelebration() {
    if (!els.deckCelebration) return;
    window.clearTimeout(celebrationTimer);
    els.deckCelebration.hidden = false;
    celebrationTimer = window.setTimeout(() => {
      els.deckCelebration.hidden = true;
    }, 2600);
  }

  function hideCelebration() {
    window.clearTimeout(celebrationTimer);
    if (els.deckCelebration) els.deckCelebration.hidden = true;
  }

  function artMarkup(card) {
    if (card.icon) {
      return `<img class="card-art" src="${card.icon}" alt="" aria-hidden="true" />`;
    }
    return `<span class="card-fallback" aria-hidden="true">${card.short}</span>`;
  }

  function rowMarkup(card) {
    const known = state.known[card.id];
    const probability = probabilityFor(card);
    const isOut = known >= card.total;
    const canDraw = state.drawn < TOTAL_CARDS && !isOut;
    const canReveal = hiddenCount() > 0 && !isOut;

    return `
      <article class="card-row${isOut ? " card-out" : ""}" data-card-id="${card.id}">
        <div class="card-line">
          <div class="card-identity">
            <div class="card-art-wrap">${artMarkup(card)}</div>
            <div class="card-copy">
              <div class="card-name-line">
                <div class="card-name">${card.name}</div>
                ${isOut ? '<span class="out-badge">OUT</span>' : ""}
              </div>
              <div class="card-sub">${known} of ${card.total} known</div>
            </div>
          </div>

          <div class="card-actions">
            <div class="probability" aria-label="${formatPercent(probability)} chance on next draw">
              <strong>${formatPercent(probability)}</strong>
              <span>next draw</span>
            </div>
            <button
              class="drew-btn"
              type="button"
              data-action="draw"
              data-card-id="${card.id}"
              aria-label="I drew ${card.name}"
              ${canDraw ? "" : "disabled"}
            >Drew</button>
            <button
              class="played-btn"
              type="button"
              data-action="played"
              data-card-id="${card.id}"
              aria-label="Opponent played ${card.name}"
              ${canReveal ? "" : "disabled"}
            >Played</button>
          </div>
        </div>
      </article>
    `;
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

    if (els.deckCard) {
      els.deckCard.classList.toggle("deck-low", remaining <= LOW_DECK_THRESHOLD);
    }

    els.unknownDrawBtn.disabled = state.drawn >= TOTAL_CARDS;
    els.undoBtn.disabled = history.length === 0;
    els.cardRows.innerHTML = CARD_TYPES.map(rowMarkup).join("");

    const title = els.unknownDrawBtn.querySelector(".primary-btn-title");
    const plus = els.unknownDrawBtn.querySelector(".primary-btn-plus");
    if (remaining <= 0) {
      title.textContent = "Dev Deck Empty";
      plus.textContent = "✓";
    } else {
      title.textContent = "Dev Bought";
      plus.textContent = "+1";
    }

    if (previousRemaining > 0 && remaining === 0) {
      showCelebration();
      setStatus("All 25 dev cards are out");
    }
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
