# Qualaces website (redesign)

Static site: plain HTML, CSS and vanilla JS. No framework and no bundler, so it hosts on any static host.

- `python3 build.py` regenerates all pages (copy lives in `build.py`; styling in `assets/css/styles.css`; behaviour in `assets/js/main.js`).
- Preview: `python3 -m http.server` in this folder.
- Contact form: `CONFIG` at the top of `assets/js/main.js` (EmailJS keys carried over from the old site; set `endpoint` to use your own backend). On failure it falls back to a pre-filled `mailto:`.
- Interface previews on the QTM page are illustrative; swap in real screenshots when available.
- Quick find: Ctrl/⌘ + K (or `/`).
