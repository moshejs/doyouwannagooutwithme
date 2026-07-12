✨ [doyouwannagooutwithme.com](https://doyouwannagooutwithme.com)

A website to invite your lover on a date 🥰

## How it works

1. Go to `/settings.html`, type their name, hit **Make my link**.
2. Copy (or share) the link it gives you: `doyouwannagooutwithme.com/index.html?to=Sarah`
3. Send it. They see *"Do you wanna go out with me, Sarah?"* and two buttons.
4. Only one of the buttons is catchable.

Static HTML/CSS/JS. No build step, no dependencies. Push it to GitHub Pages and it works.

## Files

| File | What it is |
|---|---|
| `index.html` | The invite. Reads the name from `?to=`. |
| `settings.html` | The link builder — name in, shareable link out. |
| `yes.html` | The payoff. Confetti. |
| `script.js` | All the logic for all three pages. |
| `styles.css` | All the styles for all three pages. |
| `og.png` | 1200×630 link-preview card. |
| `test.js` | Optional DOM test suite (see below). |

`yes_style.css` was folded into `styles.css` — **delete it.**

## The name in the URL

New links use a plain param: `?to=Sarah`. `URLSearchParams` does the escaping, so
spaces, accents and emoji all survive.

Old links used `?name=` with a base64 payload. Those still work — `script.js`
decodes them, and falls back to plain text if the value isn't valid base64. So a
hand-typed `?name=Sarah` works too, which it previously did not.

## Tests

The suite covers every URL shape the invite can receive, including the ones that
used to crash the page.

```bash
npm install --no-save jsdom canvas
node test.js
```

## Notes

- The `og:*` tags can't contain the recipient's name — GitHub Pages is static and
  link-preview crawlers don't run JavaScript. Every invite previews with the same
  generic card. To personalise it you'd need an edge function (Cloudflare Workers,
  Netlify Edge, Vercel) to inject `og:title` server-side.
- The GIFs are hotlinked from Giphy. If Giphy ever changes those URLs, the images
  break. Worth self-hosting them.
