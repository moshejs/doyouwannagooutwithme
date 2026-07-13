const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");

const OLD = process.env.OLD_DIR || ".";  // set OLD_DIR to compare against the old code
const NEW = ".";

// jsdom lacks these; the pages guard for them anyway, but stub so we can boot.
const shim = (w) => {
  if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addEventListener(){}, addListener(){} });
  if (!w.requestAnimationFrame) w.requestAnimationFrame = () => 0;
  if (!w.PointerEvent) w.PointerEvent = w.MouseEvent;
};

function load(dir, page, query) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on("jsdomError", (e) => errors.push(e.constructor.name + ": " + e.message));
  const dom = new JSDOM(fs.readFileSync(`${dir}/${page}`, "utf8"), {
    url: "https://doyouwannagooutwithme.com/" + page + query,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  shim(dom.window);
  dom.window.addEventListener("error", (e) => errors.push(String(e.message)));
  try {
    dom.window.eval(fs.readFileSync(`${dir}/script.js`, "utf8"));
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    dom.window.dispatchEvent(new dom.window.Event("load"));
  } catch (e) {
    errors.push("UNCAUGHT " + e.constructor.name + ": " + e.message);
  }
  const h1 = dom.window.document.querySelector("h1");
  return { text: h1 ? h1.textContent.trim() : "(no h1)", errors, dom };
}

const b64 = (s) => Buffer.from(encodeURIComponent(s)).toString("base64"); // what the OLD code produced

const cases = [
  ["invite, no name",                 "index.html", "",                        "Do you wanna go out with me?"],
  ["invite, plain ?to=Sarah",         "index.html", "?to=Sarah",               "Do you wanna go out with me, Sarah?"],
  ["invite, lowercase ?to=sarah",     "index.html", "?to=sarah",               "Do you wanna go out with me, Sarah?"],
  ["invite, spaces ?to=Anna%20Belle", "index.html", "?to=Anna%20Belle",        "Do you wanna go out with me, Anna Belle?"],
  ["invite, accents ?to=Chlo%C3%A9",  "index.html", "?to=Chlo%C3%A9",          "Do you wanna go out with me, Chloé?"],
  ["invite, HAND-TYPED ?name=Sarah",  "index.html", "?name=Sarah",             "Do you wanna go out with me, Sarah?"],
  ["invite, short ?name=Mo",          "index.html", "?name=Mo",                "Do you wanna go out with me, Mo?"],
  ["invite, LEGACY base64 link",      "index.html", "?name=" + b64("Sarah"),   "Do you wanna go out with me, Sarah?"],
  ["invite, legacy accented b64",     "index.html", "?name=" + b64("Chloé"),   "Do you wanna go out with me, Chloé?"],
  ["invite, garbage ?name=%%%",       "index.html", "?name=%25%25%25",         "Do you wanna go out with me, %%%?"],
  ["invite, XSS attempt",             "index.html", "?to=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E", null],
  ["yes page, no name",               "yes.html", "",                          "Yeeeyyy!!"],
  ["yes page, with name",             "yes.html", "?to=Sarah",                 "Yeeeyyy, Sarah!!"],
];

const run = (dir, label) => {
  console.log("\n═══ " + label + " ═══");
  let pass = 0, fail = 0;
  for (const [name, page, query, expect] of cases) {
    let r;
    try { r = load(dir, page, query); }
    catch (e) { console.log("  ✗ " + name.padEnd(30) + " CRASH " + e.message); fail++; continue; }
    const clean = r.errors.length === 0;
    const ok = expect === null ? clean : (r.text === expect && clean);
    if (ok) { pass++; console.log("  ✓ " + name.padEnd(30) + " " + JSON.stringify(r.text)); }
    else {
      fail++;
      console.log("  ✗ " + name.padEnd(30) + " " + JSON.stringify(r.text));
      if (expect) console.log("      expected: " + JSON.stringify(expect));
      r.errors.forEach((e) => console.log("      THREW: " + e.split("\n")[0]));
    }
  }
  console.log("  → " + pass + " passed, " + fail + " failed");
  return fail;
};

// Old code doesn't have ?to=, yes.html headings etc. — run it anyway to show the regressions it had.
const fails = run(NEW, "AFTER  (fixed code)");

// --- XSS check: make sure the name is never injected as HTML ---
const x = load(NEW, "index.html", "?to=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
const injected = x.dom.window.document.querySelectorAll("h1 img").length;
console.log("\n═══ XSS ═══");
console.log((injected === 0 ? "  ✓" : "  ✗") + " <img> tags injected into the heading: " + injected + " (textContent, not innerHTML)");

process.exit(fails === 0 && injected === 0 ? 0 : 1);
