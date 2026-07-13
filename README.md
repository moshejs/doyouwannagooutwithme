✨ [doyouwannagooutwithme.com](https://doyouwannagooutwithme.com)

A website to invite your lover on a date 🥰

## How it works

Put their name in the URL and send it:

```
https://doyouwannagooutwithme.com/?to=Sarah
```

They see *"Do you wanna go out with me, Sarah?"* and two buttons. Only one of
them is catchable.

Spaces, accents and emoji all survive — `?to=Anna%20Belle`, `?to=Chloé`. With no
`?to=` at all the page still works, it just doesn't greet them by name.

Static HTML/CSS/JS. No build step, no dependencies. Push it to GitHub Pages and
it works.

## Files

| File | What it is |
|---|---|
| `index.html` | The invite. |
| `yes.html` | The payoff. Confetti. |
| `script.js` | All the logic for both pages. |
| `styles.css` | All the styles for both pages. |
| `og.png` | 1200×630 link-preview card. |
| `test.js` | DOM test suite (see below). |

## The name in the URL

Links use `?to=Sarah`. `URLSearchParams` does the escaping, so it can't throw.

Old links used `?name=` with a base64 payload. Those still work — `script.js`
decodes them, and falls back to plain text if the value isn't valid base64. So a
hand-typed `?name=Sarah` works too, which it previously did not.

## The No button

Dodges on mouse, touch and keyboard focus; shrinks a little each time while Yes
grows; gives up and runs away entirely after twelve attempts. It's clamped to
the visible viewport and cannot leave the screen. <kbd>Esc</kbd> makes it hold
still, so it's never a keyboard trap.

## Tests

Covers every URL shape the invite can receive, including the ones that used to
crash the page, plus an XSS case.

```bash
npm install --no-save jsdom canvas
node test.js
```

## Notes

- The link preview deliberately doesn't reveal the question. It can't be
  personalised per recipient, though: GitHub Pages is static and preview
  crawlers don't run JavaScript, so every invite shows the same card. And the
  domain itself gives the game away in any app that renders the URL next to the
  card — a shortener is the only fix for that.
- The GIFs are hotlinked from Giphy. If those URLs ever change, the images
  break. Worth self-hosting.
