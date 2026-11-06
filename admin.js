(() => {
  "use strict";
  const C = window.APEX;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  let password = "";
  let apps = [];
  let filter = "Pending";
  let query = "";
  let sort = "new";
  const open = new Set(); // ids of expanded cards

  /* ── helpers ─────────────────────────────────────────── */
  let toastT;
  const toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2800);
  };
  const store = {
    get: () => { try { return localStorage.getItem("apexAdmin") || sessionStorage.getItem("apexAdmin") || ""; } catch (e) { return ""; } },
    set: (v, keep) => { try { (keep ? localStorage : sessionStorage).setItem("apexAdmin", v); } catch (e) {} },
    clear: () => { try { localStorage.removeItem("apexAdmin"); sessionStorage.removeItem("apexAdmin"); } catch (e) {} },
  };
  // text/plain POST: no CORS preflight, which Apps Script can't answer
  const api = async (body) => {
    const r = await fetch(C.api, { method: "POST", body: JSON.stringify({ ...body, password }) });
    return r.json();
  };
  const ago = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!isFinite(s)) return "";
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
    return new Date(iso).toLocaleDateString();
  };
  const statusOf = (a) => a.status || "Pending";

  /* ── sign in ─────────────────────────────────────────── */
  const showLogin = (err) => {
    $("#dash").hidden = true;
    $("#login").hidden = false;
    $("#notConnected").hidden = !!C.api;
    $("#loginBtn").disabled = !C.api;
    $("#loginError").hidden = !err;
    $("#loginError").textContent = err || "";
  };
  const load = async () => {
    const res = await api({ action: "list" });
    if (!res.ok) throw new Error(res.error || "Couldn't load");
    apps = res.applications || [];
  };
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    password = f.password.value;
    const btn = $("#loginBtn");
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      await load();
      store.set(password, f.remember.checked);
      showDash();
    } catch (err) {
      showLogin(err.message === "Wrong password." ? "That password isn't right." : "Couldn't reach the Google Sheet. Check the script URL and that it's deployed for Anyone.");
    } finally {
      btn.disabled = !C.api;
      btn.textContent = "Sign in";
    }
  });
  $("#logoutBtn").addEventListener("click", () => { store.clear(); password = ""; apps = []; showLogin(); });

  /* ── dashboard ───────────────────────────────────────── */
  const showDash = () => {
    $("#login").hidden = true;
    $("#dash").hidden = false;
    render();
  };
  const counts = () => {
    const c = { All: apps.length, Pending: 0, Accepted: 0, Declined: 0 };
    apps.forEach((a) => c[statusOf(a)]++);
    return c;
  };
  const render = () => {
    const c = counts();
    $("#tiles").innerHTML = [
      ["All", "Applications", "prism"],
      ["Pending", "Waiting for you", "question-medal"],
      ["Accepted", "Accepted", "trophy"],
      ["Declined", "Declined", "document"],
    ].map(([k, label, ic]) => `<button class="tile${filter === k ? " on" : ""}" data-filter="${k}"><img src="assets/icons/${ic}.webp" alt="" /><div><b>${c[k]}</b><span>${label}</span></div></button>`).join("");
    $("#filters").innerHTML = ["Pending", "Accepted", "Declined", "All"]
      .map((k) => `<button class="chip${filter === k ? " on" : ""}" role="tab" aria-selected="${filter === k}" data-filter="${k}">${k}<span>${c[k]}</span></button>`)
      .join("");

    let list = apps.filter((a) => filter === "All" || statusOf(a) === filter);
    if (query) list = list.filter((a) => `${a.roblox} ${a.discord}`.toLowerCase().includes(query));
    list.sort((a, b) => (sort === "new" ? -1 : 1) * (new Date(a.submittedAt) - new Date(b.submittedAt)));
    $("#empty").hidden = list.length > 0;
    $("#empty").textContent = query ? "Nobody matches that search." : filter === "Pending" ? "You're all caught up. No applications waiting." : "No applications here yet.";
    $("#apps").innerHTML = list.map(card).join("");
  };
  const chip = (label, v) => (v ? `<span class="info"><em>${label}</em>${esc(v)}</span>` : "");
  const card = (a) => {
    const st = statusOf(a);
    const isOpen = open.has(a.id);
    return `
    <article class="app st-${st.toLowerCase()}${isOpen ? " open" : ""}" data-id="${esc(a.id)}">
      <header class="app-head" data-toggle>
        <div class="who">
          <b>${esc(a.roblox)}</b>
          <span>@${esc(a.discord)}</span>
        </div>
        <span class="badge">${st}</span>
        <span class="when">${esc(ago(a.submittedAt))}</span>
      </header>
      <div class="infos">${chip("Focus", a.focus)}${chip("Hours/week", a.hours)}${chip("Active", a.activity)}${chip("Found via", a.found)}${chip("Tested before", a.experience)}</div>
      <div class="app-body">
        <div class="answer"><h4>What they like about Apex</h4><p>${esc(a.likes) || "–"}</p></div>
        ${a.experience === "Yes" ? `<div class="answer"><h4>Where they tested before</h4><p>${esc(a.experienceWhere) || "–"}</p></div>` : ""}
        <div class="answer"><h4>What they expect from Apex</h4><p>${esc(a.expect) || "–"}</p></div>
        <label class="note"><h4>Your note (only you see this)</h4><textarea data-note rows="2" placeholder="e.g. good bug reports, invite to round 2">${esc(a.note)}</textarea></label>
        <div class="links">
          <a href="https://www.roblox.com/search/users?keyword=${encodeURIComponent(a.roblox)}" target="_blank" rel="noopener">Find on Roblox ›</a>
          <button data-copy="${esc(a.discord)}">Copy Discord name</button>
          <button class="danger" data-delete>Delete</button>
        </div>
      </div>
      <footer class="app-actions">
        <button class="btn btn-sm act-accept" data-status="Accepted"${st === "Accepted" ? " disabled" : ""}>Accept</button>
        <button class="btn btn-sm act-decline" data-status="Declined"${st === "Declined" ? " disabled" : ""}>Decline</button>
        ${st !== "Pending" ? `<button class="btn btn-sm btn-ghost" data-status="Pending">Undo</button>` : ""}
        <button class="more" data-toggle>${isOpen ? "Hide answers" : "Show answers"}</button>
      </footer>
    </article>`;
  };

  /* ── actions ─────────────────────────────────────────── */
  const setStatus = async (id, status) => {
    const a = apps.find((x) => x.id === id);
    if (!a) return;
    const before = a.status;
    a.status = status; // optimistic
    render();
    toast(status === "Pending" ? `${a.roblox} moved back to pending.` : `${status} ${a.roblox}.`);
    try {
      const res = await api({ action: "update", id, status });
      if (!res.ok) throw new Error(res.error);
    } catch (err) {
      a.status = before;
      render();
      toast(`Couldn't save that: ${err.message || "network error"}`);
    }
  };
  document.addEventListener("click", async (e) => {
    const f = e.target.closest("[data-filter]");
    if (f) { filter = f.dataset.filter; render(); return; }
    const card = e.target.closest(".app");
    if (!card) return;
    const id = card.dataset.id;
    const s = e.target.closest("[data-status]");
    if (s) return setStatus(id, s.dataset.status);
    if (e.target.closest("[data-toggle]")) {
      open.has(id) ? open.delete(id) : open.add(id);
      render();
      return;
    }
    const cp = e.target.closest("[data-copy]");
    if (cp) {
      try { await navigator.clipboard.writeText(cp.dataset.copy); toast("Discord name copied."); } catch (err) { toast(cp.dataset.copy); }
      return;
    }
    if (e.target.closest("[data-delete]")) {
      const a = apps.find((x) => x.id === id);
      if (!confirm(`Delete ${a.roblox}'s application? This removes the row from the sheet.`)) return;
      apps = apps.filter((x) => x.id !== id);
      render();
      const res = await api({ action: "delete", id }).catch(() => ({ ok: false }));
      if (!res.ok) { toast("Couldn't delete it, refreshing."); refresh(); } else toast("Deleted.");
    }
  });
  // notes save when you click away
  document.addEventListener("change", async (e) => {
    if (!e.target.matches("[data-note]")) return;
    const id = e.target.closest(".app").dataset.id;
    const a = apps.find((x) => x.id === id);
    a.note = e.target.value;
    const res = await api({ action: "update", id, note: a.note }).catch(() => ({ ok: false }));
    toast(res.ok ? "Note saved." : "Couldn't save the note.");
  });
  let qT;
  $("#search").addEventListener("input", (e) => { clearTimeout(qT); qT = setTimeout(() => { query = e.target.value.trim().toLowerCase(); render(); }, 120); });
  $("#sort").addEventListener("change", (e) => { sort = e.target.value; render(); });
  const refresh = async () => {
    const b = $("#refreshBtn");
    b.textContent = "Refreshing…";
    try { await load(); render(); toast("Up to date."); } catch (err) { toast("Couldn't refresh."); }
    b.textContent = "Refresh";
  };
  $("#refreshBtn").addEventListener("click", refresh);

  // CSV export (opens fine in Excel and Google Sheets)
  $("#exportBtn").addEventListener("click", () => {
    const cols = ["submittedAt", "status", "roblox", "discord", "activity", "hours", "found", "focus", "experience", "experienceWhere", "likes", "expect", "note"];
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...apps.map((a) => cols.map((c) => cell(a[c])).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    link.download = `apex-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  });

  /* ── start ───────────────────────────────────────────── */
  (async () => {
    password = store.get();
    if (!password || !C.api) return showLogin();
    try { await load(); showDash(); } catch (err) { store.clear(); showLogin(); }
  })();
})();
