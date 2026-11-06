(() => {
  "use strict";
  const C = window.APEX;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const icon = (n) => `<img class="q-ico" src="assets/icons/${n}.webp" alt="" draggable="false" />`;
  const DISCORD_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.86-.6 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .09-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.12l.37-.3a.07.07 0 0 1 .08-.01c3.93 1.8 8.18 1.8 12.06 0a.07.07 0 0 1 .08.01l.37.3a.08.08 0 0 1 0 .12c-.6.35-1.22.65-1.88.9a.08.08 0 0 0-.04.1c.36.7.77 1.37 1.23 2a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"/></svg>';
  $("#discordLink").href = C.discordInvite;

  /* ── The questions ───────────────────────────────────── */
  const Q = [
    { id: "roblox", type: "text", icon: "star", title: "What's your Roblox username?", hint: "So we can add you to the test server.", placeholder: "e.g. Builderman", max: 20,
      check: (v) => (/^[A-Za-z0-9_]{3,20}$/.test(v) ? "" : "Roblox usernames are 3 to 20 letters, numbers or underscores.") },
    { id: "discord", type: "text", icon: "discord", title: "And your Discord username?", hint: "If you get picked, this is where we'll message you.", placeholder: "e.g. suleyman.cgn", max: 37,
      check: (v) => (/^[a-z0-9_.]{2,32}$/i.test(v.replace(/^@/, "")) ? "" : "That doesn't look like a Discord username.") },
    { id: "activity", type: "choice", icon: "gear", title: "How active are you on Roblox?", options: ["Every day", "A few times a week", "Mostly weekends", "Now and then"] },
    { id: "hours", type: "choice", icon: "list", title: "How many hours a week could you put into testing?", options: ["Under 2 hours", "2 to 5 hours", "5 to 10 hours", "More than 10 hours"] },
    { id: "found", type: "choice", icon: "question-medal", title: "How did you find out about Apex?", options: ["TikTok", "YouTube", "Discord", "A friend", "On Roblox", "Somewhere else"] },
    { id: "likes", type: "long", icon: "heart", title: "What do you like about Apex?", hint: "Be honest, it helps us know what to keep.", placeholder: "The abilities, the gameplay, the vibe…" },
    { id: "focus", type: "choice", icon: "crystal", title: "What would you rather do as a tester?", options: ["Hunt for bugs", "Just play and have fun", "A bit of both"] },
    { id: "experience", type: "choice", icon: "document", title: "Have you tested a game before?", options: ["Yes", "No"] },
    { id: "experienceWhere", type: "long", icon: "document", title: "Where was that, and what did you do?", hint: "Which game, for how long, and what kind of testing.", placeholder: "I tested … for … and mostly …", showIf: (a) => a.experience === "Yes" },
    { id: "expect", type: "long", icon: "trophy", title: "What do you expect from Apex?", hint: "What would make it the best football game on Roblox for you?", placeholder: "I'd love to see …" },
  ];
  const CHOICE_QS = Q.filter((q) => q.type === "choice");

  /* ── Google Sheet backend (see google-script/Code.gs) ── */
  // POST as text/plain so the browser doesn't need a CORS preflight (Apps Script can't answer those)
  const api = (body) =>
    fetch(C.api, { method: "POST", body: JSON.stringify(body) }).then((r) => r.json());
  let statsCache = null;
  const getStats = () =>
    !C.api
      ? Promise.resolve(null)
      : (statsCache ||= fetch(`${C.api}?action=stats`).then((r) => r.json()).then((d) => (d.ok ? d.stats : null)).catch(() => null));

  /* ── Small helpers ───────────────────────────────────── */
  let toastT;
  const toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 3200);
  };
  const mem = {
    get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  // Screen transitions: the old screen slides out, the new one slides in (direction depends on going forward/back)
  const stage = $("#stage");
  const show = (html, dir = 1, after) => {
    const old = stage.firstElementChild;
    const next = document.createElement("section");
    next.className = "screen";
    next.innerHTML = html;
    if (!old || reduce) {
      stage.replaceChildren(next);
      after?.(next);
      return;
    }
    old.classList.add(dir > 0 ? "out-left" : "out-right");
    next.classList.add(dir > 0 ? "in-right" : "in-left");
    stage.append(next);
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("in-right", "in-left")));
    setTimeout(() => old.remove(), 450);
    after?.(next);
  };
  const setProgress = (p) => {
    const bar = $("#progress");
    bar.hidden = p == null;
    if (p != null) $("#progressBar").style.width = `${Math.round(p * 100)}%`;
  };

  /* ── Welcome ─────────────────────────────────────────── */
  const applied = () => mem.get("apexApplied");
  const welcome = (dir = -1) => {
    setProgress(null);
    const done = applied();
    show(
      `<div class="welcome">
        <div class="logo-art"><img src="assets/logo.webp" alt="${esc(C.game)}" width="760" height="868" decoding="async" fetchpriority="high" /></div>
        <p class="eyebrow">${esc(C.game)} · Tester program</p>
        <h1>Help us test <span>${esc(C.game)}</span> before anyone else.</h1>
        <p class="lead">We're looking for players who want early access, like finding bugs, or just want to have fun with new stuff first. It takes about two minutes to apply.</p>
        <div class="count-pill"><span class="live"></span><b id="appCount">…</b> people applied so far</div>
        <div class="actions">
          ${
            !C.open
              ? `<p class="note">Applications are closed right now. Keep an eye on the Discord for the next round.</p>`
              : !C.api
                ? `<p class="note">Applications open very soon. Join the Discord so you don't miss it.</p>`
              : done
                ? `<p class="note">You already applied as <b>${esc(done.roblox)}</b>. We'll message you on Discord if you get picked.</p>`
                : `<button class="btn btn-primary btn-lg" data-start>Start application</button>`
          }
          <button class="btn btn-ghost btn-lg" data-go="stats">See the stats</button>
        </div>
      </div>`,
      dir,
      () => getStats().then((st) => { const el = $("#appCount"); if (el) el.textContent = st ? st.total.toLocaleString("en-US") : "–"; })
    );
  };

  /* ── Questions ───────────────────────────────────────── */
  let answers = {};
  let step = 0;
  let startedAt = 0;
  const visible = () => Q.filter((q) => !q.showIf || q.showIf(answers));

  const ask = (i, dir = 1) => {
    const qs = visible();
    step = Math.max(0, Math.min(i, qs.length - 1));
    const q = qs[step];
    const last = step === qs.length - 1;
    setProgress(step / qs.length);
    const val = answers[q.id] ?? "";
    let field = "";
    if (q.type === "text")
      field = `<input class="field" id="answer" type="text" maxlength="${q.max || 60}" autocomplete="off" spellcheck="false" placeholder="${esc(q.placeholder)}" value="${esc(val)}" />`;
    if (q.type === "long")
      field = `<textarea class="field" id="answer" rows="4" maxlength="600" placeholder="${esc(q.placeholder)}">${esc(val)}</textarea><span class="chars" id="chars">${val.length}/600</span>`;
    if (q.type === "choice")
      field = `<div class="choices" role="radiogroup">${q.options
        .map((o, k) => `<button type="button" class="choice${val === o ? " on" : ""}" role="radio" aria-checked="${val === o}" data-val="${esc(o)}"><kbd>${String.fromCharCode(65 + k)}</kbd>${esc(o)}</button>`)
        .join("")}</div>`;
    show(
      `<form class="question" novalidate>
        <p class="step">Question ${step + 1} of ${qs.length}</p>
        <div class="q-head">${q.icon === "discord" ? `<span class="q-ico discord">${DISCORD_SVG}</span>` : icon(q.icon)}<h2>${esc(q.title)}</h2></div>
        ${q.hint ? `<p class="hint">${esc(q.hint)}</p>` : ""}
        ${field}
        <p class="error" id="err" hidden></p>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <div class="nav-row">
          <button type="button" class="btn btn-ghost" data-back>${step === 0 ? "Back to start" : "Back"}</button>
          <button type="submit" class="btn btn-primary" id="nextBtn">${last ? "Send application" : "Next"}</button>
        </div>
        ${q.type !== "choice" ? `<p class="kbd-hint">Press <kbd>Enter</kbd> to continue${q.type === "long" ? ", <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line" : ""}</p>` : `<p class="kbd-hint">Tip: press <kbd>A</kbd>, <kbd>B</kbd>, <kbd>C</kbd>… to pick</p>`}
      </form>`,
      dir,
      (el) => {
        const form = $("form", el);
        const input = $("#answer", el);
        if (input && !matchMedia("(pointer: coarse)").matches) setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 320);
        if (input && q.type === "long") input.addEventListener("input", () => ($("#chars", el).textContent = `${input.value.length}/600`));
        if (input && q.type === "long")
          input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
        if (q.type === "choice") {
          $$(".choice", el).forEach((b) =>
            b.addEventListener("click", () => {
              $$(".choice", el).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
              answers[q.id] = b.dataset.val;
              setTimeout(() => form.requestSubmit(), reduce ? 0 : 260); // move on by itself
            })
          );
        }
        $("[data-back]", el).addEventListener("click", () => (step === 0 ? welcome() : ask(step - 1, -1)));
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          if (form.website.value) return; // honeypot: bots fill hidden fields
          const err = $("#err", el);
          let v = q.type === "choice" ? answers[q.id] : input.value.trim();
          let msg = "";
          if (!v) msg = q.type === "choice" ? "Pick one of the options." : "Please fill this in.";
          else if (q.check) msg = q.check(v);
          else if (q.type === "long" && v.length < 3) msg = "Write a bit more than that.";
          if (msg) {
            err.textContent = msg;
            err.hidden = false;
            form.classList.remove("shake");
            void form.offsetWidth;
            form.classList.add("shake");
            return;
          }
          if (q.id === "discord") v = v.replace(/^@/, "");
          answers[q.id] = v;
          if (q.id === "experience" && v === "No") delete answers.experienceWhere;
          mem.set("apexDraft", answers);
          const qs2 = visible();
          if (step >= qs2.length - 1) submit();
          else ask(step + 1, 1);
        });
      }
    );
  };

  // Keyboard letters for multiple choice
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(document.activeElement?.tagName)) return;
    const choices = $$(".screen:last-child .choice");
    if (!choices.length) return;
    const k = e.key.toUpperCase().charCodeAt(0) - 65;
    if (e.key.length === 1 && k >= 0 && k < choices.length) choices[k].click();
  });

  /* ── Sending ─────────────────────────────────────────── */
  const clip = (s, n = 1000) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const submit = async () => {
    setProgress(1);
    show(`<div class="sending"><div class="spinner"></div><h2>Sending your application…</h2></div>`, 1);
    if (Date.now() - startedAt < 8000) { await new Promise((r) => setTimeout(r, 1200)); return fail("That was super fast. Take a second and try again."); }
    if (!C.api) return fail("Applications aren't connected yet. Please try again later or DM us on Discord.");
    let res;
    try {
      res = await api({ action: "apply", application: { ...answers, website: "" } });
    } catch (err) {
      return fail("Couldn't send it right now. Your answers are saved, so just try again in a minute.");
    }
    if (!res.ok) {
      if (res.duplicate) mem.set("apexApplied", { roblox: answers.roblox, at: Date.now() });
      return fail(res.error || "Something went wrong. Try again in a minute.");
    }
    statsCache = null;
    mem.set("apexApplied", { roblox: answers.roblox, at: Date.now() });
    localStorage.removeItem("apexDraft");
    done();
  };
  const fail = (msg) =>
    show(
      `<div class="sending"><img class="q-ico big" src="assets/icons/question-medal.webp" alt="" /><h2>Hmm, that didn't work</h2><p class="lead">${esc(msg)}</p>
        <div class="actions"><button class="btn btn-primary" data-retry>Try again</button><a class="btn btn-ghost" href="${esc(C.discordInvite)}" target="_blank" rel="noopener">Ask on Discord</a></div></div>`,
      1,
      (el) => $("[data-retry]", el).addEventListener("click", () => ask(visible().length - 1, -1))
    );

  const done = () => {
    setProgress(null);
    show(
      `<div class="welcome done">
        <div class="diamond"><img src="assets/icons/trophy.webp" alt="" /></div>
        <h1>You're in, <span>${esc(answers.roblox)}</span>.</h1>
        <p class="lead">Thanks for applying. We go through every application ourselves, and if you get picked we'll message <b>@${esc(answers.discord)}</b> on Discord. Make sure you're in the server so we can reach you.</p>
        <div class="actions">
          <a class="btn btn-primary btn-lg discord-btn" href="${esc(C.discordInvite)}" target="_blank" rel="noopener">${DISCORD_SVG}Join the Discord</a>
          <button class="btn btn-ghost btn-lg" data-go="stats">See the stats</button>
        </div>
      </div>`,
      1,
      () => celebrate()
    );
  };
  const celebrate = () => {
    if (reduce) return;
    const icons = ["prism", "star", "crystal", "heart", "trophy"];
    for (let i = 0; i < 18; i++) {
      const im = document.createElement("img");
      im.src = `assets/icons/${icons[i % icons.length]}.webp`;
      im.className = "confetti";
      const size = 22 + Math.random() * 22;
      im.style.cssText = `left:${50 + (Math.random() - 0.5) * 20}vw;top:38vh;width:${size}px;height:${size}px`;
      document.body.append(im);
      im.animate(
        [
          { transform: "translate(0,0) rotate(0) scale(.4)", opacity: 1 },
          { transform: `translate(${(Math.random() - 0.5) * 70}vw, ${-20 - Math.random() * 25}vh) rotate(${(Math.random() - 0.5) * 360}deg) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${(Math.random() - 0.5) * 90}vw, ${40 + Math.random() * 20}vh) rotate(${(Math.random() - 0.5) * 720}deg) scale(.9)`, opacity: 0 },
        ],
        { duration: 1800 + Math.random() * 900, easing: "cubic-bezier(.2,.7,.3,1)" }
      ).onfinish = () => im.remove();
    }
  };

  /* ── Stats ───────────────────────────────────────────── */
  const stats = async () => {
    setProgress(null);
    show(
      `<div class="stats">
        <p class="eyebrow">Live numbers</p>
        <h1>Tester applications</h1>
        <p class="lead">Everyone can see these. They only show totals, never names or answers.</p>
        <div class="big-stat"><img class="big-logo" src="assets/logo-icon.webp" alt="" /><div><b id="sTotal">…</b><span>applications so far</span></div></div>
        <p class="accepted-line" id="sAccepted"></p>
        <div class="charts" id="charts">${CHOICE_QS.map((q) => `<div class="chart"><div class="chart-head">${icon(q.icon)}<h3>${esc(q.title)}</h3></div><div class="bars" data-q="${q.id}">${q.options.map((o) => `<div class="bar-row"><span class="bar-label">${esc(o)}</span><span class="bar"><i style="width:0%"></i></span><span class="bar-num">…</span></div>`).join("")}</div></div>`).join("")}</div>
        <div class="actions">${C.open && C.api && !applied() ? `<button class="btn btn-primary btn-lg" data-start>Apply now</button>` : ""}<button class="btn btn-ghost btn-lg" data-go="welcome">Back to start</button></div>
      </div>`,
      1
    );
    const st = await getStats();
    const tEl = $("#sTotal");
    if (!tEl) return;
    if (!st) { tEl.textContent = "–"; return C.api && toast("Couldn't load the stats right now."); }
    const total = st.total;
    const acc = $("#sAccepted");
    if (acc && st.status) acc.textContent = `${st.status.Accepted || 0} accepted so far, ${st.status.Pending || 0} still waiting for a reply.`;
    // count up
    const t0 = performance.now();
    const tick = (t) => { const k = Math.min(1, (t - t0) / 900); tEl.textContent = Math.round(total * (1 - Math.pow(1 - k, 3))).toLocaleString("en-US"); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    CHOICE_QS.forEach((q) => {
      const counts = q.options.map((o) => (st.choices[q.id] || {})[o] || 0);
      const sum = counts.reduce((a, b) => a + b, 0);
      const rows = $$(`.bars[data-q="${q.id}"] .bar-row`);
      const top = Math.max(...counts);
      rows.forEach((row, k) => {
        const pct = sum ? Math.round((counts[k] / sum) * 100) : 0;
        $(".bar-num", row).textContent = sum ? `${pct}%` : "0%";
        row.classList.toggle("leader", sum > 0 && counts[k] === top);
        setTimeout(() => ($("i", row).style.width = `${pct}%`), 80 + k * 70);
      });
    });
  };

  /* ── Routing (buttons anywhere) ──────────────────────── */
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); go.dataset.go === "stats" ? stats() : welcome(); return; }
    if (e.target.closest("[data-start]")) {
      answers = mem.get("apexDraft") || {};
      startedAt = Date.now();
      ask(0, 1);
    }
  });

  const route = () => (location.hash === "#stats" ? stats() : welcome());
  addEventListener("hashchange", route);
  route();
})();
