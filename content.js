(() => {
  // Prevent duplicate injection when the user captures multiple times on the same page
  if (window.__quickScreenshotLoaded) return;
  window.__quickScreenshotLoaded = true;

  // ================= Configuration =================
  const FONT =
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const COLORS = [
    "#ff3b30",
    "#ffcc00",
    "#34c759",
    "#0a84ff",
    "#1c1c1e",
    "#ffffff",
  ];
  const SIZES = [
    { title: "Thin", stroke: 2, text: 16, dot: 5 },
    { title: "Medium", stroke: 4, text: 22, dot: 8 },
    { title: "Thick", stroke: 8, text: 32, dot: 12 },
  ];
  const TOOLS = [
    { id: "pen", title: "Pen (P)", key: "p" },
    { id: "highlight", title: "Highlighter (H)", key: "h" },
    { id: "rect", title: "Rectangle (R)", key: "r" },
    { id: "arrow", title: "Arrow (A)", key: "a" },
    { id: "text", title: "Text (T)", key: "t" },
    { id: "pixelate", title: "Pixelate (B)", key: "b" },
  ];

  // Icon data rendered with createElementNS (avoid innerHTML because some pages enable Trusted Types)
  const ICONS = {
    pen: [
      ["path", { d: "M12 20h9" }],
      ["path", { d: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" }],
    ],
    highlight: [
      ["path", { d: "m9 11-6 6v3h9l3-3" }],
      [
        "path",
        { d: "m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" },
      ],
    ],
    rect: [["rect", { x: "3", y: "5", width: "18", height: "14", rx: "1.5" }]],
    arrow: [
      ["path", { d: "M5 19 19 5" }],
      ["path", { d: "M9 5h10v10" }],
    ],
    text: [
      ["path", { d: "M4 7V4h16v3" }],
      ["path", { d: "M9 20h6" }],
      ["path", { d: "M12 4v16" }],
    ],
    pixelate: [
      ["rect", { x: "3", y: "3", width: "7", height: "7" }],
      ["rect", { x: "14", y: "14", width: "7", height: "7" }],
      ["rect", { x: "14", y: "3", width: "7", height: "7", opacity: ".4" }],
      ["rect", { x: "3", y: "14", width: "7", height: "7", opacity: ".4" }],
    ],
    undo: [
      ["path", { d: "M9 14 4 9l5-5" }],
      ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 0 11H11" }],
    ],
    redo: [
      ["path", { d: "m15 14 5-5-5-5" }],
      ["path", { d: "M20 9H9.5a5.5 5.5 0 0 0 0 11H13" }],
    ],
    crop: [
      ["path", { d: "M6 2v14a2 2 0 0 0 2 2h14" }],
      ["path", { d: "M18 22V8a2 2 0 0 0-2-2H2" }],
    ],
    close: [
      ["path", { d: "M18 6 6 18" }],
      ["path", { d: "m6 6 12 12" }],
    ],
    download: [
      ["path", { d: "M12 3v12" }],
      ["path", { d: "m7 10 5 5 5-5" }],
      ["path", { d: "M5 21h14" }],
    ],
    copy: [
      ["rect", { x: "9", y: "9", width: "12", height: "12", rx: "2" }],
      [
        "path",
        { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" },
      ],
    ],
  };

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .root { position: fixed; inset: 0; font: 13px/1.4 ${FONT}; color: #1c1c1e;
            user-select: none; -webkit-user-select: none; }
    .root.selecting { cursor: crosshair; }
    .bg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .dim { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
    .hidden { display: none !important; }

    .sel { position: absolute; outline: 1.5px dashed #fff; box-shadow: 0 0 0 99999px rgba(0,0,0,.45); }
    .size-label { position: absolute; left: 0; top: -28px; padding: 3px 8px; border-radius: 6px;
                  background: rgba(0,0,0,.78); color: #fff; font-size: 12px; white-space: nowrap;
                  font-variant-numeric: tabular-nums; pointer-events: none; }
    .size-label.inside { top: 6px; left: 6px; }
    .edit-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block;
                   cursor: crosshair; touch-action: none; }
    .edit-canvas.text-mode { cursor: text; }

    .hint { position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
            display: flex; align-items: center; gap: 6px; padding: 6px 6px 6px 16px;
            background: #fff; border-radius: 12px; cursor: default; white-space: nowrap;
            box-shadow: 0 10px 30px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.06); }
    .hint-text { margin-right: 8px; color: #3a3a3c; }

    .toolbar { position: absolute; display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
               padding: 6px; background: #fff; border-radius: 12px; cursor: default;
               max-width: calc(100vw - 16px);
               box-shadow: 0 10px 30px rgba(0,0,0,.3), 0 0 0 1px rgba(0,0,0,.06); }
    .group { display: flex; align-items: center; gap: 2px; }
    .sep { width: 1px; height: 22px; background: #e5e5ea; margin: 0 6px; }

    .btn { all: unset; box-sizing: border-box; width: 32px; height: 32px; border-radius: 8px;
           display: inline-flex; align-items: center; justify-content: center;
           color: #3a3a3c; cursor: pointer; }
    .btn svg { width: 18px; height: 18px; }
    .btn:hover { background: #f2f2f7; }
    .btn.active { background: #e3eefe; color: #0a64d8; }
    .btn:disabled { opacity: .3; cursor: default; background: none; }
    .btn:focus-visible, .btn-text:focus-visible { outline: 2px solid #0a84ff; outline-offset: 1px; }

    .swatch { width: 26px; }
    .swatch.active { background: none; }
    .swatch .chip { width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); }
    .swatch.active .chip { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #0a84ff; }
    .size .dot { border-radius: 50%; background: currentColor; }

    .btn-text { all: unset; box-sizing: border-box; height: 32px; padding: 0 12px; border-radius: 8px;
                display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 600; }
    .btn-text svg { width: 16px; height: 16px; }
    .btn-text.ghost { color: #3a3a3c; }
    .btn-text.ghost:hover { background: #f2f2f7; }
    .btn-text.primary { background: #0a84ff; color: #fff; }
    .btn-text.primary:hover { background: #0071e3; }

    .textbox { position: absolute; margin: 0; padding: 0; border: none; background: transparent;
               outline: 1.5px dashed rgba(10,132,255,.9); resize: none; overflow: hidden;
               white-space: pre; line-height: 1.2; font-weight: 600; min-width: 24px; }
  `;

  const TOAST_CSS = `
    :host { all: initial; }
    .toast { position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);
             padding: 10px 16px; border-radius: 10px; background: rgba(28,28,30,.94); color: #fff;
             font: 500 13px/1.4 ${FONT}; box-shadow: 0 10px 30px rgba(0,0,0,.3);
             animation: in .18s ease-out; max-width: calc(100vw - 32px); }
    .toast.warn { background: #b25000; }
    @keyframes in { from { opacity: 0; transform: translate(-50%, 8px); } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `;

  // ================= Utilities =================
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "className") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) e.append(c);
    return e;
  }

  function icon(name) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    const attrs = {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    };
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    for (const [tag, a] of ICONS[name]) {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(a)) n.setAttribute(k, v);
      svg.append(n);
    }
    return svg;
  }

  function sheet(css) {
    // Constructable stylesheet: not blocked by the page's style-src CSP like a <style> tag
    const s = new CSSStyleSheet();
    s.replaceSync(css);
    return s;
  }

  function dataUrlToBlob(dataUrl) {
    // Decode base64 manually instead of using <img src> to avoid the page's img-src CSP restriction
    const [head, b64] = dataUrl.split(",");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: head.match(/:(.*?);/)[1] });
  }

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const normRect = (x1, y1, x2, y2) => ({
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  });

  function toast(message, warn = false) {
    const host = document.createElement("div");
    host.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.adoptedStyleSheets = [sheet(TOAST_CSS)];
    shadow.append(
      el("div", { className: warn ? "toast warn" : "toast", text: message }),
    );
    document.documentElement.append(host);
    setTimeout(() => host.remove(), warn ? 3500 : 2000);
  }

  // ================= Screenshot UI =================
  let current = null;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "QS_START") return;
    current?.destroy();
    current = new ScreenshotUI(msg.dataUrl);
  });

  class ScreenshotUI {
    constructor(dataUrl) {
      this.mode = "select";
      this.tool = "pen";
      this.color = COLORS[0];
      this.size = SIZES[1];
      this.shapes = [];
      this.redoStack = [];
      this.drawing = null;
      this.textBox = null;
      this.destroyed = false;

      this.onKey = this.onKey.bind(this);
      this.onResize = () => this.destroy();

      this.host = document.createElement("div");
      this.host.style.cssText =
        "all:initial;position:fixed;inset:0;z-index:2147483647;";
      // Block keyboard events from the overlay (e.g. when typing) from leaking to page shortcuts
      for (const type of ["keydown", "keyup", "keypress"]) {
        this.host.addEventListener(type, (e) => e.stopPropagation());
      }
      this.shadow = this.host.attachShadow({ mode: "closed" });
      this.shadow.adoptedStyleSheets = [sheet(CSS)];
      document.documentElement.append(this.host);

      this.init(dataUrl).catch((err) => {
        console.error("[Quick Screenshot]", err);
        this.destroy();
      });
    }

    async init(dataUrl) {
      this.bitmap = await createImageBitmap(dataUrlToBlob(dataUrl));
      if (this.destroyed) return;
      this.vw = window.innerWidth;
      this.vh = window.innerHeight;
      // Real image pixel ratio / CSS pixel ratio (Retina, page zoom, etc.)
      this.sx = this.bitmap.width / this.vw;
      this.sy = this.bitmap.height / this.vh;

      this.buildSelectUI();
      window.addEventListener("keydown", this.onKey, true);
      window.addEventListener("resize", this.onResize);
    }

    // ---------- Step 1: select area ----------
    buildSelectUI() {
      const bg = el("canvas", { className: "bg" });
      bg.width = this.bitmap.width;
      bg.height = this.bitmap.height;
      bg.getContext("2d").drawImage(this.bitmap, 0, 0);

      this.dim = el("div", { className: "dim" });
      this.sizeLabel = el("div", { className: "size-label" });
      this.sel = el("div", { className: "sel hidden" }, [this.sizeLabel]);
      this.hint = el("div", { className: "hint" }, [
        el("span", {
          className: "hint-text",
          text: "Drag the mouse to select the area to capture",
        }),
        el(
          "button",
          {
            className: "btn-text ghost",
            onclick: () =>
              this.enterEdit({ x: 0, y: 0, w: this.vw, h: this.vh }),
          },
          [el("span", { text: "Capture full screen" })],
        ),
        el(
          "button",
          {
            className: "btn",
            title: "Cancel (Esc)",
            onclick: () => this.destroy(),
          },
          [icon("close")],
        ),
      ]);

      this.root = el("div", { className: "root selecting" }, [
        bg,
        this.dim,
        this.sel,
        this.hint,
      ]);
      this.root.addEventListener("pointerdown", (e) => this.onSelectDown(e));
      this.root.addEventListener("pointermove", (e) => this.onSelectMove(e));
      this.root.addEventListener("pointerup", (e) => this.onSelectUp(e));
      this.root.addEventListener("wheel", (e) => e.preventDefault(), {
        passive: false,
      });
      this.root.addEventListener("contextmenu", (e) => e.preventDefault());
      this.shadow.append(this.root);
    }

    onSelectDown(e) {
      if (
        this.mode !== "select" ||
        e.button !== 0 ||
        this.hint.contains(e.target)
      )
        return;
      e.preventDefault();
      this.root.setPointerCapture(e.pointerId);
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.hint.classList.add("hidden");
    }

    onSelectMove(e) {
      if (this.mode !== "select" || !this.dragStart) return;
      const x = clamp(e.clientX, 0, this.vw),
        y = clamp(e.clientY, 0, this.vh);
      this.showSel(normRect(this.dragStart.x, this.dragStart.y, x, y));
    }

    onSelectUp(e) {
      if (this.mode !== "select" || !this.dragStart) return;
      const x = clamp(e.clientX, 0, this.vw),
        y = clamp(e.clientY, 0, this.vh);
      const r = normRect(this.dragStart.x, this.dragStart.y, x, y);
      this.dragStart = null;
      if (r.w < 8 || r.h < 8) {
        // Accidental click / dragging too small: return to the initial state
        this.sel.classList.add("hidden");
        this.dim.classList.remove("hidden");
        this.hint.classList.remove("hidden");
        return;
      }
      this.enterEdit(r);
    }

    showSel(r) {
      Object.assign(this.sel.style, {
        left: r.x + "px",
        top: r.y + "px",
        width: r.w + "px",
        height: r.h + "px",
      });
      this.sel.classList.remove("hidden");
      this.dim.classList.add("hidden");
      this.sizeLabel.textContent = `${Math.round(r.w * this.sx)} × ${Math.round(r.h * this.sy)}`;
      this.sizeLabel.classList.toggle("inside", r.y < 32);
    }

    // ---------- Step 2: edit ----------
    enterEdit(r) {
      this.mode = "edit";
      this.rect = r;
      this.root.classList.replace("selecting", "editing");
      this.hint.classList.add("hidden");
      this.showSel(r);
      this.sizeLabel.classList.add("hidden");

      const W = Math.max(1, Math.round(r.w * this.sx));
      const H = Math.max(1, Math.round(r.h * this.sy));
      this.scale = W / r.w;

      // Original image is cropped and kept separate for redrawing & blurring
      this.base = document.createElement("canvas");
      this.base.width = W;
      this.base.height = H;
      this.base
        .getContext("2d")
        .drawImage(this.bitmap, r.x * this.sx, r.y * this.sy, W, H, 0, 0, W, H);

      this.canvas = el("canvas", { className: "edit-canvas" });
      this.canvas.width = W;
      this.canvas.height = H;
      this.ctx = this.canvas.getContext("2d");
      this.canvas.addEventListener("mousedown", (e) => e.preventDefault()); // giữ focus cho ô nhập chữ
      this.canvas.addEventListener("pointerdown", (e) => this.onDrawDown(e));
      this.canvas.addEventListener("pointermove", (e) => this.onDrawMove(e));
      this.canvas.addEventListener("pointerup", () => this.onDrawUp());
      this.sel.append(this.canvas);

      this.shapes = [];
      this.redoStack = [];
      this.buildToolbar();
      this.setTool(this.tool);
      this.redraw();
    }

    buildToolbar() {
      this.toolButtons = {};
      const tools = el(
        "div",
        { className: "group" },
        TOOLS.map((t) => {
          const b = el(
            "button",
            {
              className: "btn",
              title: t.title,
              onclick: () => this.setTool(t.id),
            },
            [icon(t.id)],
          );
          this.toolButtons[t.id] = b;
          return b;
        }),
      );

      this.colorButtons = COLORS.map((c) => {
        const chip = el("span", { className: "chip" });
        chip.style.background = c;
        return el(
          "button",
          {
            className: "btn swatch",
            title: c,
            onclick: () => this.setColor(c),
          },
          [chip],
        );
      });
      const colors = el("div", { className: "group" }, this.colorButtons);

      this.sizeButtons = SIZES.map((s) => {
        const dot = el("span", { className: "dot" });
        dot.style.width = dot.style.height = s.dot + "px";
        return el(
          "button",
          {
            className: "btn size",
            title: s.title,
            onclick: () => this.setSize(s),
          },
          [dot],
        );
      });
      const sizes = el("div", { className: "group" }, this.sizeButtons);

      this.undoBtn = el(
        "button",
        {
          className: "btn",
          title: "Undo (Ctrl+Z)",
          onclick: () => this.undo(),
        },
        [icon("undo")],
      );
      this.redoBtn = el(
        "button",
        {
          className: "btn",
          title: "Redo (Ctrl+Shift+Z)",
          onclick: () => this.redo(),
        },
        [icon("redo")],
      );
      const history = el("div", { className: "group" }, [
        this.undoBtn,
        this.redoBtn,
      ]);

      const actions = el("div", { className: "group" }, [
        el(
          "button",
          {
            className: "btn",
            title: "Select area again",
            onclick: () => this.reselect(),
          },
          [icon("crop")],
        ),
        el(
          "button",
          {
            className: "btn",
            title: "Cancel (Esc)",
            onclick: () => this.destroy(),
          },
          [icon("close")],
        ),
        el(
          "button",
          {
            className: "btn",
            title: "Download (Ctrl+S)",
            onclick: () => this.download(),
          },
          [icon("download")],
        ),
        el(
          "button",
          {
            className: "btn-text primary",
            title: "Copy to clipboard (Enter / Ctrl+C)",
            onclick: () => this.copy(),
          },
          [icon("copy"), el("span", { text: "Copy" })],
        ),
      ]);

      const sep = () => el("div", { className: "sep" });
      this.toolbar = el("div", { className: "toolbar" }, [
        tools,
        sep(),
        colors,
        sep(),
        sizes,
        sep(),
        history,
        sep(),
        actions,
      ]);
      this.toolbar.addEventListener("pointerdown", (e) => e.stopPropagation());
      this.toolbar.addEventListener("mousedown", (e) => e.preventDefault()); // giữ focus ô chữ khi đổi màu/cỡ
      this.root.append(this.toolbar);

      this.setColor(this.color);
      this.setSize(this.size);
      this.updateHistoryButtons();
      this.positionToolbar();
    }

    positionToolbar() {
      const m = 8,
        { x, y, w, h } = this.rect;
      const tw = this.toolbar.offsetWidth,
        th = this.toolbar.offsetHeight;
      let top = y + h + m; // prioritize below the selected area
      if (top + th > this.vh - m) top = y - th - m; // not enough space, move upward
      if (top < m) top = y + h - th - m; // still not enough, place inside the selected area
      top = clamp(top, m, this.vh - th - m);
      const left = clamp(x + w - tw, m, Math.max(m, this.vw - tw - m));
      Object.assign(this.toolbar.style, { top: top + "px", left: left + "px" });
    }

    setTool(id) {
      this.commitText();
      this.tool = id;
      for (const [k, b] of Object.entries(this.toolButtons))
        b.classList.toggle("active", k === id);
      this.canvas.classList.toggle("text-mode", id === "text");
    }

    setColor(c) {
      this.color = c;
      this.colorButtons.forEach((b, i) =>
        b.classList.toggle("active", COLORS[i] === c),
      );
      if (this.textBox) {
        this.textBox.color = c;
        this.textBox.ta.style.color = c;
      }
    }

    setSize(s) {
      this.size = s;
      this.sizeButtons.forEach((b, i) =>
        b.classList.toggle("active", SIZES[i] === s),
      );
    }

    reselect() {
      this.cancelText();
      this.canvas?.remove();
      this.toolbar?.remove();
      this.canvas = this.toolbar = null;
      this.mode = "select";
      this.root.classList.replace("editing", "selecting");
      this.sel.classList.add("hidden");
      this.sizeLabel.classList.remove("hidden");
      this.dim.classList.remove("hidden");
      this.hint.classList.remove("hidden");
    }

    // ---------- Vẽ ----------
    toCanvas(e) {
      const b = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - b.left) * (this.canvas.width / b.width),
        y: (e.clientY - b.top) * (this.canvas.height / b.height),
      };
    }

    onDrawDown(e) {
      if (e.button !== 0) return;
      e.stopPropagation();
      if (this.textBox) {
        this.commitText();
        return;
      } // click outside = finalize the text being typed
      const p = this.toCanvas(e);
      if (this.tool === "text") {
        this.openTextBox(e, p);
        return;
      }

      this.canvas.setPointerCapture(e.pointerId);
      const common = {
        type: this.tool,
        color: this.color,
        width: this.size.stroke * this.scale,
      };
      this.drawing =
        this.tool === "pen" || this.tool === "highlight"
          ? { ...common, points: [p] }
          : { ...common, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
      this.redraw();
    }

    onDrawMove(e) {
      if (!this.drawing) return;
      const p = this.toCanvas(e);
      if (this.drawing.points) this.drawing.points.push(p);
      else {
        this.drawing.x2 = p.x;
        this.drawing.y2 = p.y;
      }
      this.redraw();
    }

    onDrawUp() {
      const d = this.drawing;
      if (!d) return;
      this.drawing = null;
      const big =
        d.points || Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 4 * this.scale;
      if (big) {
        this.shapes.push(d);
        this.redoStack = [];
      }
      this.redraw();
      this.updateHistoryButtons();
    }

    openTextBox(e, p) {
      const box = this.sel.getBoundingClientRect();
      const ta = el("textarea", {
        className: "textbox",
        rows: "1",
        wrap: "off",
        spellcheck: "false",
      });
      Object.assign(ta.style, {
        left: e.clientX - box.left + "px",
        top: e.clientY - box.top + "px",
        font: `600 ${this.size.text}px/1.2 ${FONT}`,
        color: this.color,
      });
      const fit = () => {
        ta.style.width = "1px";
        ta.style.height = "1px";
        ta.style.width = Math.max(ta.scrollWidth + 4, 24) + "px";
        ta.style.height = ta.scrollHeight + "px";
      };
      ta.addEventListener("input", fit);
      ta.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault();
          this.commitText();
        } // Shift+Enter = new line
        else if (ev.key === "Escape") {
          ev.preventDefault();
          this.cancelText();
        }
      });
      ta.addEventListener("blur", () => this.commitText());
      ta.addEventListener("pointerdown", (ev) => ev.stopPropagation());

      this.textBox = {
        ta,
        x: p.x,
        y: p.y,
        color: this.color,
        fontPx: this.size.text * this.scale,
      };
      this.sel.append(ta);
      fit();
      ta.focus();
    }

    commitText() {
      const tb = this.textBox;
      if (!tb) return;
      this.textBox = null;
      const text = tb.ta.value.replace(/\s+$/, "");
      tb.ta.remove();
      if (text) {
        this.shapes.push({
          type: "text",
          text,
          x: tb.x,
          y: tb.y,
          color: tb.color,
          fontPx: tb.fontPx,
        });
        this.redoStack = [];
      }
      this.redraw();
      this.updateHistoryButtons();
    }

    cancelText() {
      const tb = this.textBox;
      if (!tb) return;
      this.textBox = null;
      tb.ta.remove();
    }

    redraw() {
      if (!this.ctx) return;
      const c = this.ctx;
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      c.drawImage(this.base, 0, 0);
      for (const s of this.shapes) this.drawShape(c, s);
      if (this.drawing) {
        this.drawShape(c, this.drawing);
        if (this.drawing.type === "pixelate") {
          const r = normRect(
            this.drawing.x1,
            this.drawing.y1,
            this.drawing.x2,
            this.drawing.y2,
          );
          c.save();
          c.setLineDash([6 * this.scale, 4 * this.scale]);
          c.strokeStyle = "#0a84ff";
          c.lineWidth = 1.5 * this.scale;
          c.strokeRect(r.x, r.y, r.w, r.h);
          c.restore();
        }
      }
    }

    drawShape(c, s) {
      c.save();
      c.strokeStyle = c.fillStyle = s.color;
      c.lineWidth = s.width;
      c.lineCap = "round";
      c.lineJoin = "round";

      switch (s.type) {
        case "pen":
          this.strokePath(c, s.points);
          break;
        case "highlight":
          c.globalAlpha = 0.4;
          c.globalCompositeOperation = "multiply";
          c.lineWidth = s.width * 4;
          this.strokePath(c, s.points);
          break;
        case "rect": {
          const r = normRect(s.x1, s.y1, s.x2, s.y2);
          c.strokeRect(r.x, r.y, r.w, r.h);
          break;
        }
        case "arrow": {
          const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
          const head = Math.max(s.width * 3.5, 12 * this.scale);
          c.beginPath();
          c.moveTo(s.x1, s.y1);
          c.lineTo(
            s.x2 - Math.cos(ang) * head * 0.8,
            s.y2 - Math.sin(ang) * head * 0.8,
          );
          c.stroke();
          c.beginPath();
          c.moveTo(s.x2, s.y2);
          c.lineTo(
            s.x2 - head * Math.cos(ang - Math.PI / 7),
            s.y2 - head * Math.sin(ang - Math.PI / 7),
          );
          c.lineTo(
            s.x2 - head * Math.cos(ang + Math.PI / 7),
            s.y2 - head * Math.sin(ang + Math.PI / 7),
          );
          c.closePath();
          c.fill();
          break;
        }
        case "text": {
          c.font = `600 ${s.fontPx}px ${FONT}`;
          c.textBaseline = "top";
          s.text
            .split("\n")
            .forEach((line, i) =>
              c.fillText(line, s.x, s.y + s.fontPx * 0.1 + i * s.fontPx * 1.2),
            );
          break;
        }
        case "pixelate":
          this.pixelate(c, normRect(s.x1, s.y1, s.x2, s.y2));
          break;
      }
      c.restore();
    }

    strokePath(c, pts) {
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 1) c.lineTo(pts[0].x + 0.01, pts[0].y); // single click = single dot
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
      c.stroke();
    }

    pixelate(c, r) {
      const x = Math.round(r.x),
        y = Math.round(r.y),
        w = Math.round(r.w),
        h = Math.round(r.h);
      if (w < 1 || h < 1) return;
      const block = Math.max(6, Math.round(10 * this.scale));
      const tw = Math.max(1, Math.ceil(w / block)),
        th = Math.max(1, Math.ceil(h / block));
      this.tmp ??= document.createElement("canvas");
      this.tmp.width = tw;
      this.tmp.height = th;
      this.tmp.getContext("2d").drawImage(this.base, x, y, w, h, 0, 0, tw, th); // thu nhỏ...
      c.imageSmoothingEnabled = false;
      c.drawImage(this.tmp, 0, 0, tw, th, x, y, w, h); // ...rồi phóng to = vỡ ô
    }

    undo() {
      this.commitText();
      if (!this.shapes.length) return;
      this.redoStack.push(this.shapes.pop());
      this.redraw();
      this.updateHistoryButtons();
    }

    redo() {
      if (!this.redoStack.length) return;
      this.shapes.push(this.redoStack.pop());
      this.redraw();
      this.updateHistoryButtons();
    }

    updateHistoryButtons() {
      if (!this.undoBtn) return;
      this.undoBtn.disabled = !this.shapes.length;
      this.redoBtn.disabled = !this.redoStack.length;
    }

    // ---------- Export image ----------
    copy() {
      this.commitText();
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        this.saveFile(
          "This page does not allow clipboard writes (usually an http page). The image has been downloaded instead.",
          true,
        );
        return;
      }
      // Pass the Promise into ClipboardItem so write() is called immediately when the user clicks
      const blob = new Promise((resolve, reject) =>
        this.canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/png",
        ),
      );
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": blob })])
        .then(() => {
          toast("Image copied to clipboard");
          this.destroy();
        })
        .catch((err) => {
          console.warn("[Quick Screenshot] Clipboard:", err);
          this.saveFile(
            "Could not copy to clipboard. The image has been downloaded instead.",
            true,
          );
        });
    }

    download() {
      this.commitText();
      this.saveFile("Downloaded image to the Downloads/screenshots folder");
    }

    saveFile(message, warn = false) {
      chrome.runtime.sendMessage({
        type: "QS_DOWNLOAD",
        dataUrl: this.canvas.toDataURL("image/png"),
      });
      toast(message, warn);
      this.destroy();
    }

    // ---------- Shortcuts ----------
    onKey(e) {
      if (this.textBox) return; // currently typing text: let the textarea handle it
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      let handled = true;

      if (k === "escape") this.destroy();
      else if (this.mode === "edit" && mod && k === "z" && !e.shiftKey)
        this.undo();
      else if (
        this.mode === "edit" &&
        mod &&
        (k === "y" || (k === "z" && e.shiftKey))
      )
        this.redo();
      else if (this.mode === "edit" && ((mod && k === "c") || k === "enter"))
        this.copy();
      else if (this.mode === "edit" && mod && k === "s") this.download();
      else if (
        this.mode === "edit" &&
        !mod &&
        !e.altKey &&
        TOOLS.some((t) => t.key === k)
      ) {
        this.setTool(TOOLS.find((t) => t.key === k).id);
      } else handled = false;

      // Không cho trang nhận phím / cuộn trang khi overlay đang mở
      e.stopPropagation();
      if (
        handled ||
        [
          " ",
          "arrowup",
          "arrowdown",
          "pageup",
          "pagedown",
          "home",
          "end",
        ].includes(k)
      )
        e.preventDefault();
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      window.removeEventListener("keydown", this.onKey, true);
      window.removeEventListener("resize", this.onResize);
      this.host.remove();
      this.bitmap?.close();
      if (current === this) current = null;
    }
  }
})();
