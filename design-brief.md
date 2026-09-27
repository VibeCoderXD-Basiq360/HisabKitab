# Design brief — HisabKitab

Paste this whole thing as your prompt. Delete the last section if the tool
outputs images rather than code.

---

## The product

HisabKitab is a personal finance app for one person in India who tracks every
rupee, and who constantly pays for things that aren't his own cost.

The thing that makes it different from every other finance app: **it is about
money owed between people, not about a balance.** He buys groceries for his
parents. He uses his father's credit card for his own things. He covers dinner
for three friends. In all of those, the person who *paid* and the person whose
*cost it is* are different people.

So the hero of this app is **who owes whom** — not total balance. If you lead
with a balance card, you have designed the same app as everyone else.

## Who uses it

One man in his twenties, in India. Android, used one-handed, often standing at
a shop counter right after paying. He opens it several times a day to log
something in under ten seconds, and once a week to see who still owes him.

His father and a few friends also use it, less often, to pay him back.

## Screens to design

1. **Home** — what's owed to him, his accounts, recent expenses, spending trend
2. **Expenses** — a long chronological list, grouped by day, with filters
3. **Add expense** — amount, description, account, payment method, optional
   line items, who owes what
4. **People** — one netted figure per person, both directions
5. **Settle up** — tick which expenses a payment covers, choose where the money
   landed, confirm

Home is the screen to make beautiful. The other four should be quiet, fast and
legible — they are used far more often.

## Visual direction

Dark, deep green, with a lime accent. Warm rather than clinical. The feeling to
aim for is a well-made leather object: material, weighty, a little tactile —
not glassy, not neon, not corporate fintech.

Concrete devices that work:

- A **stack of cards** as the home hero — the main card in front, one or two
  account cards peeking out behind it, scaled back and overlapping
- Real **material treatment** on those cards: a directional gradient, a
  diagonal light sheen across the face, a soft inner highlight along the top
  edge, deep shadow beneath
- A faint **film grain** over the whole screen so flat colour does not look flat
- **One glow** behind the top of the screen, and nowhere else
- Generous corner radii (16-28px), generous spacing, large numbers

Everything outside the home hero is flat: bordered surfaces, no gradients, no
shadows.

## Colour tokens

Use these exactly. Do not introduce a seventeenth colour.

```
bg           #0C1611    app background
surface      #121F18    cards, panels
raised       #1A2C22    inputs, chips
line         #243A2D    borders

ink          #EDF4EE    primary text
ink-2        #9FB5A6    secondary text
ink-3        #6B8175    labels, meta

lime         #B3DD62    accent — buttons and links ONLY
lime-dim     #8FC244    gradient end, pressed state
on-lime      #14240A    text on lime

bank         #2C5E54    bank account cards
card         #DDAD71    credit card cards
cash         #3B4A42    cash

owed-to-you  #7FD1A0    money coming back
you-owe      #E8846A    money going out
settled      #4E6357    closed, done, inactive
```

Lime is for actions only. Money direction uses the mint/coral pair, never lime.
Never show direction by colour alone — always pair it with a word ("owes you",
"you owe").

## Type

Inter. Weights 400, 500, 600, 700. Tabular figures on every number.

Amounts are the hero of the type system — large, tight tracking (-0.03em),
weight 700. Labels are small and quiet. Nothing in all caps.

## Real content to use

Do not use placeholder names or dollar amounts. Use these:

- Owed to him: Dad ₹1,200 (groceries), Rahul ₹1,000 (dinner), Bala ₹1,000
- He owes Dad ₹3,000 for personal spending on Dad's credit card
- Accounts: HDFC savings ₹31,000 · HDFC credit card ₹8,200 outstanding, bill
  due 18 Sep · Cash ₹3,150
- Recent expenses: Filter coffee ₹200 · Vegetables and milk ₹2,000, Dad owes
  ₹1,200 · Dinner at Anjappar ₹4,000 on Dad's card, split four ways, ₹2,000
  already back · Petrol ₹1,500
- Currency is rupees, formatted Indian style: ₹1,00,000 not ₹100,000

Write labels as plain sentences, not finance nouns. "Coming back to you", not
"Receivables". "Where the money landed", not "Destination account".

## Behaviour to show

- An expense amount **never changes** as people pay. Show recovery as progress
  underneath: "₹4,000 · ₹2,000 back", with a thin progress bar.
- A person's balance is **one netted number**, with both directions readable
  underneath it.
- Settle up is a **tick list** — the ticked total is the payment amount.

## What to avoid

- A "Total Balance" hero. That is the wrong hero for this app.
- Neumorphism, glassmorphism, neo-brutalism.
- All-caps labels, meta strings joined by middle dots, arrows appended to
  button text.
- Identical rounded cards with the same shadow repeated down the page.
- Cartoon avatars, stock faces, brand logos.

## If you output code

- Mobile first, 390-430px wide, safe-area aware
- Every colour must come from a token. **No hex literal anywhere except the
  token file.**
- **No inline style objects.** Classes only.
- Visible keyboard focus, `prefers-reduced-motion` respected
- Motion only in response to a tap — no entrance animations on scroll
