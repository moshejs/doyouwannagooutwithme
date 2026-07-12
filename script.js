/* ------------------------------------------------------------------ *
 * doyouwannagooutwithme.com
 * Shared logic for the invite, the link builder and the yes page.
 * No dependencies, no build step.
 * ------------------------------------------------------------------ */
(() => {
  'use strict';

  const MAX_NAME_LENGTH = 40;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- *
   * Name handling
   * ---------------------------------------------------------------- */

  /** Drop control characters without relying on a regex escape soup. */
  const stripControlChars = (s) =>
    Array.from(s)
      .filter((c) => {
        const code = c.codePointAt(0);
        return code > 31 && code !== 127;
      })
      .join('');

  /** Normalise whatever we were handed into something safe to render. Never throws. */
  const cleanName = (raw) => {
    if (typeof raw !== 'string') return '';
    const cleaned = stripControlChars(raw)
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim()
      .slice(0, MAX_NAME_LENGTH);
    if (!cleaned) return '';
    const chars = Array.from(cleaned); // unicode-safe (accents, emoji)
    return chars[0].toLocaleUpperCase() + chars.slice(1).join('');
  };

  /**
   * Decoder for links shared BEFORE this fix, which used
   * btoa(encodeURIComponent(name)).
   *
   * The old code called atob() unguarded, so any ?name= that wasn't valid
   * base64 threw InvalidCharacterError and killed the whole script — which
   * is why the name never rendered. This version never throws: if the value
   * doesn't decode into something name-shaped, we treat it as plain text.
   */
  const decodeLegacyName = (raw) => {
    try {
      let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      let text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      try {
        text = decodeURIComponent(text);
      } catch (_) {
        /* wasn't %-encoded — fine */
      }
      // Guard: a short plain name ("Mo") can be *accidentally* valid base64 and
      // decode to mojibake. A real name contains at least one letter.
      if (/\p{L}/u.test(text)) return text;
    } catch (_) {
      /* not base64 at all — e.g. someone hand-typed ?name=Sarah */
    }
    return raw;
  };

  /** Read the recipient's name from the URL. Prefers the new ?to= param. */
  const getName = () => {
    const params = new URLSearchParams(window.location.search);
    const plain = params.get('to');
    if (plain) return cleanName(plain);
    const legacy = params.get('name');
    if (legacy) return cleanName(decodeLegacyName(legacy));
    return '';
  };

  /** Build a shareable invite URL. URLSearchParams does all the escaping. */
  const buildInviteUrl = (name) => {
    const url = new URL('index.html', window.location.href);
    url.search = '';
    url.searchParams.set('to', name);
    return url.href;
  };

  /* ---------------------------------------------------------------- *
   * Page 1 — the invite
   * ---------------------------------------------------------------- */

  const PLEAS = [
    'Are you sure?',
    'Really sure??',
    'Think about it again 🥺',
    'Last chance...',
    'Okay but consider: free dessert',
    'I already booked the table 😳',
    "I'm not above begging",
    'Pretty please?',
    'You are breaking my heart 💔',
    'The button is getting tired',
  ];

  const initInvite = () => {
    const noButton = document.getElementById('noButton');
    const yesButton = document.getElementById('yesButton');
    if (!noButton || !yesButton) return;

    const name = getName();
    const caption = document.getElementById('caption');

    let dodges = 0;
    let dodging = true;
    let tx = 0;
    let ty = 0;
    let noScale = 1;

    if (REDUCED_MOTION) noButton.style.transition = 'none';

    const paint = () => {
      noButton.style.transform = `translate(${tx}px, ${ty}px) scale(${noScale})`;
      yesButton.style.transform = `scale(${Math.min(1.85, 1 + dodges * 0.07)})`;
    };

    const dodge = (event) => {
      if (!dodging) return;
      if (event && event.cancelable) event.preventDefault();
      dodges += 1;

      const pad = 12;
      const rect = noButton.getBoundingClientRect();
      // Where the button would sit with no transform applied.
      const homeLeft = rect.left - tx;
      const homeTop = rect.top - ty;

      const minX = pad - homeLeft;
      const maxX = window.innerWidth - pad - rect.width - homeLeft;
      const minY = pad - homeTop;
      const maxY = window.innerHeight - pad - rect.height - homeTop;

      // Pick a spot that is actually far from where the cursor just was.
      let nx = tx;
      let ny = ty;
      for (let i = 0; i < 12; i++) {
        nx = minX + Math.random() * Math.max(0, maxX - minX);
        ny = minY + Math.random() * Math.max(0, maxY - minY);
        if (Math.hypot(nx - tx, ny - ty) > 120) break;
      }
      tx = nx;
      ty = ny;
      noScale = Math.max(0.4, noScale * 0.92);
      paint();

      if (caption) caption.textContent = PLEAS[Math.min(dodges - 1, PLEAS.length - 1)];

      if (dodges >= 12) {
        dodging = false;
        noButton.hidden = true;
        if (caption) caption.textContent = 'The No button ran away. 🏃‍♀️💨';
      }
    };

    // Mouse, pen, touch and keyboard focus all trigger the dodge.
    noButton.addEventListener('pointerenter', dodge);
    noButton.addEventListener('pointerdown', dodge);
    noButton.addEventListener('touchstart', dodge, { passive: false });
    noButton.addEventListener('focus', dodge);
    noButton.addEventListener('click', dodge);

    // Escape hatch: a fleeing button shouldn't become a keyboard trap.
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !dodging) return;
      dodging = false;
      tx = 0;
      ty = 0;
      noScale = 1;
      paint();
      if (caption) caption.textContent = 'Fine. The button will hold still. 😔';
    });

    // Keep the button on-screen if the viewport changes underneath it.
    window.addEventListener('resize', () => {
      if (!dodging) return;
      const rect = noButton.getBoundingClientRect();
      if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
        tx = 0;
        ty = 0;
        paint();
      }
    });

    yesButton.addEventListener('click', () => {
      const url = new URL('yes.html', window.location.href);
      url.search = '';
      if (name) url.searchParams.set('to', name);
      window.location.href = url.href;
    });

    // Render the name.
    const placeholder = document.getElementById('namePlaceholder');
    if (placeholder) placeholder.textContent = name ? `, ${name}` : '';
    if (name) document.title = `Do you wanna go out with me, ${name}?`;
  };

  /* ---------------------------------------------------------------- *
   * Page 2 — the link builder (settings.html)
   * ---------------------------------------------------------------- */

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Safari / non-secure-context fallback.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (__) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    }
  };

  const initBuilder = () => {
    const form = document.getElementById('loverForm');
    if (!form) return;

    const input = document.getElementById('loverName');
    const error = document.getElementById('formError');
    const result = document.getElementById('result');
    const linkText = document.getElementById('linkText');
    const copyButton = document.getElementById('copyButton');
    const shareButton = document.getElementById('shareButton');
    const previewButton = document.getElementById('previewButton');

    let inviteUrl = '';

    if (shareButton && !navigator.share) shareButton.hidden = true;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = cleanName(input.value);
      if (!name) {
        error.textContent = 'Give me a name first 🙂';
        input.focus();
        return;
      }
      error.textContent = '';
      inviteUrl = buildInviteUrl(name);
      linkText.textContent = inviteUrl;
      linkText.href = inviteUrl;
      result.hidden = false;
      copyButton.textContent = 'Copy link';
      result.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'nearest' });
    });

    copyButton.addEventListener('click', async () => {
      if (!inviteUrl) return;
      const ok = await copyToClipboard(inviteUrl);
      copyButton.textContent = ok ? 'Copied ✓' : 'Copy failed — select it manually';
      setTimeout(() => {
        copyButton.textContent = 'Copy link';
      }, 2000);
    });

    if (shareButton) {
      shareButton.addEventListener('click', async () => {
        if (!inviteUrl) return;
        try {
          await navigator.share({
            title: 'Do you wanna go out with me?',
            text: 'I have a question for you 👀',
            url: inviteUrl,
          });
        } catch (_) {
          /* user dismissed the share sheet */
        }
      });
    }

    previewButton.addEventListener('click', () => {
      if (inviteUrl) window.open(inviteUrl, '_blank', 'noopener');
    });
  };

  /* ---------------------------------------------------------------- *
   * Page 3 — yes.html
   * ---------------------------------------------------------------- */

  const confetti = () => {
    if (REDUCED_MOTION) return;
    const canvas = document.getElementById('confetti');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // no 2d context available — the page still works, just no confetti
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const size = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);

    const colors = ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8FAB', '#FFFFFF'];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * -window.innerHeight,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vy: 1.5 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      rot: Math.random() * Math.PI * 2,
      vr: -0.1 + Math.random() * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const started = Date.now();
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > window.innerHeight + 20) {
          p.y = -20;
          p.x = Math.random() * window.innerWidth;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (Date.now() - started < 8000) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    requestAnimationFrame(tick);
  };

  const initYes = () => {
    const heading = document.getElementById('yesHeading');
    if (!heading) return;
    const name = getName();
    if (name) {
      heading.textContent = `Yeeeyyy, ${name}!!`;
      document.title = `${name} said yes! 🎉`;
    }
    confetti();
  };

  /* ---------------------------------------------------------------- *
   * Boot — each init is a no-op on the pages it doesn't apply to.
   * ---------------------------------------------------------------- */
  const boot = () => {
    initInvite();
    initBuilder();
    initYes();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
