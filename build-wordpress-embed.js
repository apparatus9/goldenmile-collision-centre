// Build a single paste-ready block for a WordPress Custom HTML block.
//  - inlines styles.css, scoped under #gmcc so it cannot touch the theme
//  - adds a defensive reset so the theme cannot reach into the block either
//  - prefixes every id so it cannot collide with the theme's own #main etc.
//  - gives every inline <svg> explicit width/height so a CSS failure can't
//    blow one up to full-page size
//  - points images at jsDelivr (absolute) instead of relative assets/
const fs = require('fs'), p = require('path');

const SRC = __dirname;
const OUT = p.join(__dirname, 'wordpress-embed.html');
const SCOPE = '#gmcc';
const CDN = 'https://cdn.jsdelivr.net/gh/apparatus9/goldenmile-collision-centre@main/assets/';

const css = fs.readFileSync(p.join(SRC, 'styles.css'), 'utf8');
const html = fs.readFileSync(p.join(SRC, 'index.html'), 'utf8');

/* ---------- 1. namespace the class names ----------
   Scoping under #gmcc stops our CSS reaching the theme, but not the theme's
   CSS reaching us: class names like .header, .nav, .hero, .btn, .section and
   .wrap are exactly what a dealership theme calls its own furniture, and a
   theme rule that is more specific (or uses !important) still wins. Renaming
   every class means no theme rule can match our markup at all. */
const NS = 'gm-';
const CLASSES = new Set([
  ...(html.match(/class="([^"]*)"/g) || [])
    .flatMap(a => a.slice(7, -1).trim().split(/\s+/))
    .filter(Boolean),
  // also anything the stylesheet styles but the markup does not currently use,
  // so no class selector is left behind for the theme to match
  ...(css.match(/\.(-?[A-Za-z_][\w-]*)/g) || []).map(c => c.slice(1)),
]);

const nsSelector = s => s.replace(/\.(-?[A-Za-z_][\w-]*)/g,
  (m, c) => CLASSES.has(c) ? '.' + NS + c : m);

/* ---------- 2. scope the CSS ---------- */

function scopeSelector(sel) {
  return sel.split(',').map(s => {
    s = s.trim();
    if (!s) return s;
    if (s === ':root' || s === 'html' || s === 'body') return SCOPE;  // page-level -> the wrapper
    return SCOPE + ' ' + nsSelector(s);
  }).join(', ');
}

function transform(text) {
  let out = '', i = 0;
  while (i < text.length) {
    const brace = text.indexOf('{', i);
    if (brace < 0) { out += text.slice(i); break; }

    const prelude = text.slice(i, brace);
    let depth = 1, j = brace + 1;
    while (j < text.length && depth > 0) {
      const c = text[j];
      if (c === '{') depth++; else if (c === '}') depth--;
      j++;
    }
    const body = text.slice(brace + 1, j - 1);

    const lastComment = prelude.lastIndexOf('*/');          // keep comments above a rule
    const trivia  = lastComment >= 0 ? prelude.slice(0, lastComment + 2) : '';
    const rawSel  = lastComment >= 0 ? prelude.slice(lastComment + 2) : prelude;
    const sel     = rawSel.trim();
    const lead    = rawSel.slice(0, rawSel.length - rawSel.trimStart().length);

    if (sel.startsWith('@')) {
      const nested = /^@(media|supports|layer|container)\b/.test(sel);
      out += trivia + lead + sel + ' {' + (nested ? transform(body) : body) + '}';
    } else {
      const scopedSel = scopeSelector(sel);
      let rule = body;
      // An inline <svg> carries no intrinsic size, so a theme rule as ordinary
      // as `svg { width: 100% }` resizes every icon, and with !important it wins
      // outright. These four classes are the only sized svgs we have; pin them.
      if (/\.gm-(i|trust__i|svc__i|mopar__arc)\b/.test(scopedSel)) {
        rule = rule.replace(/(^|[;{\s])(width|height)\s*:\s*([^;!]+);/g,
                            (m, pre, prop, val) => `${pre}${prop}: ${val.trim()} !important;`);
      }
      out += trivia + lead + scopedSel + ' {' + rule + '}';
    }
    i = j;
  }
  return out;
}

/* A rem resolves against the ROOT element's font-size, and the root is the
   theme's <html>, which we cannot set from inside a page. styles.css never
   sets one, so standalone every rem is the 16px browser default - but a theme
   that sets html { font-size: 18px } (or 62.5%, or 112.5%) silently rescales
   all 148 of them, and the whole design comes out the wrong size. Resolve them
   at build time instead. em is untouched: it resolves against the element's
   own font-size, which we do control. */
const REM = 16;
const cssPx = css.replace(/(-?[\d.]+)rem\b/g,
  (m, n) => +(parseFloat(n) * REM).toFixed(4) + 'px');

let scoped = transform(cssPx);

/* Namespacing keeps the theme's class rules off our markup, but it has no
   answer to an !important on a plain element selector, and page-builder themes
   do emit things like `#main p { font-size: 24px !important }` from their
   typography settings. Only !important beats !important, so put one on the two
   properties that visibly wreck the layout when they are overridden. Relative
   order inside our own stylesheet is unchanged, so the media queries still win
   over the base rules exactly as before. */
for (const prop of ['font-size', 'font-family']) {
  scoped = scoped.replace(
    new RegExp(`([;{]\\s*)${prop}\\s*:\\s*([^;!}]+?)\\s*(?=[;}])`, 'g'),
    (m, pre, val) => `${pre}${prop}: ${val} !important`);
}

// the sticky header fights the theme's own header once embedded
scoped = scoped.replace(/position: sticky;/,
  'position: relative; /* was sticky - the theme has its own header */');

// an @import has to be the first thing in a stylesheet
const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Barlow:wght@300;400;500;600&display=swap');";

/* Goes BEFORE the real stylesheet, and is deliberately low-specificity so
   every rule below still wins. Stops theme element styles - img borders,
   list bullets, blockquote decoration, uppercase headings - reaching in. */
const DEFENCE = `
/* ---- defensive reset: keeps the theme out --------------------------- */
${SCOPE} *, ${SCOPE} *::before, ${SCOPE} *::after {
  box-sizing: border-box;
  margin: 0;              /* beats theme section/ul/figure margins   */
  padding: 0;
  font-family: inherit;   /* beats a theme-wide * { font-family }    */
  font-size: inherit;     /* beats a theme p { font-size }           */
  line-height: inherit;   /* beats a theme p { line-height }         */
  border: 0;
  border-radius: 0;
  box-shadow: none;
  text-shadow: none;
  text-transform: none;
  letter-spacing: normal;
  background: none;       /* colour and image both                   */
  float: none;
  min-width: 0;
}
${SCOPE} ul, ${SCOPE} ol { list-style: none; }

/* Most of our text has no font-size of its own - it inherits from the wrapper -
   so there is no declaration for the build to mark !important, and a theme rule
   such as  #main p { font-size: 24px !important }  lands unopposed. Naming the
   elements matches that specificity, and we are later in the document, so we
   win the tie. Our own class rules are more specific again and still win here. */
${SCOPE} p, ${SCOPE} li, ${SCOPE} dt, ${SCOPE} dd, ${SCOPE} span, ${SCOPE} a,
${SCOPE} strong, ${SCOPE} em, ${SCOPE} blockquote, ${SCOPE} div, ${SCOPE} label,
${SCOPE} article, ${SCOPE} section, ${SCOPE} figure, ${SCOPE} h1, ${SCOPE} h2,
${SCOPE} h3, ${SCOPE} h4 { font-size: inherit !important; }
${SCOPE} blockquote::before, ${SCOPE} blockquote::after,
${SCOPE} q::before, ${SCOPE} q::after { content: none; }
${SCOPE} a { text-decoration: none; }
${SCOPE} table { border-collapse: collapse; }
`;

/* Goes AFTER the stylesheet: styles.css has body{margin:0}, which scopes to
   #gmcc{margin:0} and would otherwise cancel the full-bleed margins. */
const WRAPPER = `
/* ---- wrapper -------------------------------------------------------- */
${SCOPE} { box-sizing: border-box; }

/* FULL-BLEED. Lets the design escape the theme's content column.
   This page wants a full-width (no sidebar) page template.
   DELETE the next line to keep the block inside the column instead -
   the script at the bottom checks this rule and follows suit.          */
${SCOPE} { margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); width: auto; }
`;

/* calc(50% - 50vw) only lands correctly when the content column is centred
   in the viewport. With a sidebar it is not, so measure and correct. */
const BLEED = `
<script>
(function () {
  var el = document.getElementById('gmcc');
  if (!el) return;
  // if the full-bleed rule above was deleted, do nothing
  if (parseFloat(getComputedStyle(el).marginLeft) >= 0) return;
  function bleed() {
    el.style.marginLeft = el.style.marginRight = '0';
    var r = el.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    // only ever widen, never pull the block narrower than its column
    el.style.marginLeft  = Math.min(0, -r.left) + 'px';
    el.style.marginRight = Math.min(0, -(vw - r.right)) + 'px';
  }
  bleed();
  window.addEventListener('resize', bleed);
})();
<\/script>`;

/* ---------- 2. rework the markup ---------- */

let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));

// absolute image urls
body = body.replace(/src="assets\/([^"]+)"/g, (m, f) => `src="${CDN}${f}"`);

// belt and braces: an <svg> with only a viewBox has no intrinsic size, so if the
// stylesheet ever fails to load it expands to fill its container. Pin it.
body = body.replace(/<svg ([^>]*?)viewBox="0 0 (\d+) (\d+)"/g,
  (m, pre, w, h) => `<svg ${pre}width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"`);

// prefix every id - the theme almost certainly has its own #main
for (const id of ['main', 'about', 'services', 'care', 'promise', 'contact', 'navtoggle', 'yr']) {
  body = body.replace(new RegExp(`id="${id}"`, 'g'), `id="gmcc-${id}"`)
             .replace(new RegExp(`href="#${id}"`, 'g'), `href="#gmcc-${id}"`)
             .replace(new RegExp(`for="${id}"`, 'g'), `for="gmcc-${id}"`)
             .replace(new RegExp(`getElementById\\('${id}'\\)`, 'g'), `getElementById('gmcc-${id}')`);
}
// namespace the class attributes to match the renamed selectors
body = body.replace(/class="([^"]*)"/g, (m, v) =>
  'class="' + v.trim().split(/\s+/).map(c => CLASSES.has(c) ? NS + c : c).join(' ') + '"');

// keep the inline script's nav selector inside our wrapper
body = body.replace("document.querySelectorAll('.nav a')",
                    `document.querySelectorAll('#gmcc .${NS}nav a')`);

const out = `<!--
  Golden Mile Chrysler - Collision Centre
  Paste this whole thing into ONE "Custom HTML" block (block editor) or the
  "Text" tab of the Classic editor. Not the visual editor - it rewrites the
  markup and breaks the layout.
-->
<style>
${FONTS}
${DEFENCE}${scoped}
${WRAPPER}</style>

<div id="gmcc">
${body.trim()}
</div>
${BLEED}
`;

fs.writeFileSync(OUT, out, 'utf8');
console.log('wrote', OUT);
console.log('size', (out.length / 1024).toFixed(1) + ' KB');
