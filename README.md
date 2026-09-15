# Catan Dev Card Assistant

A tiny browser-based development-card counter designed to sit beside a Colonist.io game in a narrow split-screen window.

## What it tracks

Standard 25-card CATAN development deck:

- 14 Knights
- 5 Victory Points
- 2 Road Building
- 2 Year of Plenty
- 2 Monopoly

## Controls

### Unknown Draw
Use when an opponent buys a development card and you do not know its identity.

### Drew
Use on a specific card row when **you** buy that card. This records both:
1. one card leaving the physical deck, and
2. the card's known identity.

### Seen
Use when an opponent's previously hidden card gets played or otherwise revealed.

If you already recorded your own card with **Drew**, do not press **Seen** when you later play it. Its identity was already known.

### Undo / Reset
- **Undo** reverses the most recent action.
- **Reset** starts a fresh game.
- Nothing is persisted. Reloading the page also starts fresh.

## Probability model

The app distinguishes between:

- **Physical deck**: cards that can still be drawn.
- **Known cards**: drawn cards whose identities are known.
- **Hidden cards**: cards opponents drew but have not revealed.

A hidden opponent draw reduces the physical deck size, but by itself does not change the posterior probability of the next card's identity. Its type is still unknown and is part of the same unseen card pool.

For card type `i`:

```text
P(next card is i)
= (original cards of type i - known cards of type i)
  / (25 - total known card identities)
```

The "Est. in deck" value is the expected physical count remaining after accounting for hidden cards:

```text
Expected cards of type i in physical deck
= unseen cards of type i
  × physical cards remaining
  / total unseen cards
```

## Run locally

Open `index.html` in a browser. No build step or server is required.

## Publish with GitHub Pages

1. Push these files to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Set Pages to deploy from the repository's main branch/root.
4. GitHub will provide the public URL.

## Files

- `index.html` — app shell
- `styles.css` — narrow portrait-style UI
- `app.js` — state, actions, probability model
