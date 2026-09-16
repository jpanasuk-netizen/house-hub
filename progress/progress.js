(function () {
  const CATS = ["hunt", "sites", "ai-stack", "agents", "ship", "money", "media", "lab"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const timelineEl = document.getElementById("timeline");
  const chipsEl = document.getElementById("chips");
  const countEl = document.getElementById("count");
  const emptyEl = document.getElementById("empty");
  const themesEl = document.getElementById("themes");
  const verifiedEl = document.getElementById("verified");
  const gapsEl = document.getElementById("gaps");
  const rangeEl = document.getElementById("range-pill");
  const builtEl = document.getElementById("built-pill");
  const rulesEl = document.getElementById("rules");

  let events = [];
  let filter = "all";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function dateKey(d) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (/^\d{4}-\d{2}$/.test(d)) return d + "-15";
    return d + "-00";
  }

  function monthKey(d) {
    return String(d).slice(0, 7);
  }

  function formatDate(d) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split("-").map(Number);
      return MONTHS[m - 1].slice(0, 3) + " " + day + ", " + y;
    }
    if (/^\d{4}-\d{2}$/.test(d)) {
      const [y, m] = d.split("-").map(Number);
      return MONTHS[m - 1] + " " + y;
    }
    return d;
  }

  function monthLabel(ym) {
    const [y, m] = ym.split("-").map(Number);
    return MONTHS[m - 1] + " " + y;
  }

  function flags(ev) {
    const e = String(ev.evidence || "");
    const out = [];
    if (/^GAP\b/i.test(e)) out.push(["gap", "GAP"]);
    if (/^UNVERIFIED\b/i.test(e)) out.push(["unverified", "UNVERIFIED"]);
    if (/^\d{4}-\d{2}$/.test(ev.date)) out.push(["approx", "approx"]);
    return out;
  }

  function linkLabel(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "");
      const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
      const tail = parts.slice(-2).join("/");
      const hash = u.hash ? u.hash : "";
      return tail ? host + "/" + tail + hash : host + (u.pathname === "/" ? "/" : "") + hash;
    } catch (_) {
      return url;
    }
  }

  function statusClass(status) {
    return String(status || "")
      .replace(/[^\w]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function sortEvents(list) {
    return list
      .map(function (ev, i) { return { ev: ev, i: i }; })
      .sort(function (a, b) {
        const ka = dateKey(a.ev.date);
        const kb = dateKey(b.ev.date);
        if (ka < kb) return -1;
        if (ka > kb) return 1;
        return a.i - b.i;
      })
      .map(function (x) { return x.ev; });
  }

  function renderThemes(themes) {
    themesEl.innerHTML = "";
    themes.forEach(function (t) {
      const span = document.createElement("span");
      span.className = "theme";
      span.textContent = t.label;
      if (t.blurb) span.title = t.blurb;
      themesEl.appendChild(span);
    });
  }

  function renderChips(list) {
    chipsEl.innerHTML = "";
    const counts = { all: list.length };
    CATS.forEach(function (c) { counts[c] = 0; });
    list.forEach(function (ev) {
      if (counts[ev.category] != null) counts[ev.category] += 1;
    });

    function add(cat, label) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (filter === cat ? " on" : "");
      b.dataset.cat = cat;
      b.textContent = label + " " + counts[cat];
      b.addEventListener("click", function () {
        filter = cat;
        chipsEl.querySelectorAll(".chip").forEach(function (c) {
          c.classList.toggle("on", c.dataset.cat === filter);
        });
        apply();
      });
      chipsEl.appendChild(b);
    }

    add("all", "all");
    CATS.forEach(function (c) { add(c, c); });
  }

  function renderTimeline(list) {
    timelineEl.innerHTML = "";
    let lastMonth = "";
    let monthEl = null;
    let rail = null;

    list.forEach(function (ev, idx) {
      const mk = monthKey(ev.date);
      if (mk !== lastMonth) {
        lastMonth = mk;
        monthEl = document.createElement("div");
        monthEl.className = "month";
        monthEl.dataset.month = mk;
        monthEl.textContent = monthLabel(mk);
        timelineEl.appendChild(monthEl);
        rail = document.createElement("div");
        rail.className = "rail";
        rail.dataset.month = mk;
        timelineEl.appendChild(rail);
      }

      const fl = flags(ev);
      const flagHtml = fl.map(function (f) {
        return '<span class="flag ' + f[0] + '">' + esc(f[1]) + "</span>";
      }).join("");
      const links = Array.isArray(ev.links) ? ev.links.filter(Boolean) : [];
      const linkHtml = links.map(function (u) {
        return '<a class="deeplink" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(linkLabel(u)) + "</a>";
      }).join("");

      const card = document.createElement("article");
      card.className = "event";
      card.dataset.cat = ev.category;
      card.dataset.idx = String(idx);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "event-toggle";
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML =
        '<div class="head">' +
          '<span class="date">' + esc(formatDate(ev.date)) + (fl.some(function (f) { return f[0] === "approx"; }) ? " · approx" : "") + "</span>" +
          '<span class="cat">' + esc(ev.category) + "</span>" +
          flagHtml +
        "</div>" +
        "<p class=\"title\">" + esc(ev.title) + "</p>" +
        '<p class="hint">' + esc(ev.summary) + "</p>" +
        '<div class="expand-cue">Tap for summary + evidence</div>';

      const body = document.createElement("div");
      body.className = "body";
      body.innerHTML =
        "<h3>Summary</h3>" +
        "<p>" + esc(ev.summary) + "</p>" +
        "<h3>Evidence</h3>" +
        '<div class="evidence">' + esc(ev.evidence || "") + "</div>" +
        (linkHtml ? "<h3>Links</h3><div class=\"links\">" + linkHtml + "</div>" : "");

      btn.addEventListener("click", function () {
        const open = card.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        const cue = btn.querySelector(".expand-cue");
        if (cue) cue.textContent = open ? "Tap to collapse" : "Tap for summary + evidence";
      });

      card.appendChild(btn);
      card.appendChild(body);
      rail.appendChild(card);
    });
  }

  function apply() {
    let n = 0;
    const cards = timelineEl.querySelectorAll(".event");
    cards.forEach(function (el) {
      const ok = filter === "all" || el.dataset.cat === filter;
      el.classList.toggle("hidden", !ok);
      if (ok) n += 1;
    });
    timelineEl.querySelectorAll(".rail").forEach(function (rail) {
      const any = rail.querySelector(".event:not(.hidden)");
      rail.classList.toggle("hidden", !any);
      const month = timelineEl.querySelector('.month[data-month="' + rail.dataset.month + '"]');
      if (month) month.classList.toggle("hidden", !any);
    });
    countEl.textContent = n + " / " + events.length + " events";
    emptyEl.classList.toggle("show", n === 0);
  }

  function renderVerified(groups) {
    verifiedEl.innerHTML = "";
    groups.forEach(function (g) {
      const wrap = document.createElement("div");
      wrap.className = "url-group";
      const h = document.createElement("h3");
      h.textContent = g.group;
      wrap.appendChild(h);
      const ul = document.createElement("ul");
      (g.urls || []).forEach(function (u) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = u;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = u;
        li.appendChild(a);
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      verifiedEl.appendChild(wrap);
    });
  }

  function renderGaps(rows) {
    gapsEl.innerHTML = "";
    rows.forEach(function (row) {
      const card = document.createElement("article");
      card.className = "gap-card";
      const cls = statusClass(row.status);
      card.innerHTML =
        '<div class="gap-head">' +
          '<span class="status ' + esc(cls) + '">' + esc(row.status) + "</span>" +
          "<h3>" + esc(row.item) + "</h3>" +
        "</div>" +
        "<p>" + esc(row.notes) + "</p>";
      gapsEl.appendChild(card);
    });
  }

  function fail(msg) {
    timelineEl.innerHTML = '<p class="err">' + esc(msg) + "</p>";
  }

  Promise.all([
    fetch("timeline-data.json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("timeline-data.json " + r.status);
      return r.json();
    }),
    fetch("pack-meta.json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("pack-meta.json " + r.status);
      return r.json();
    })
  ]).then(function (pair) {
    const raw = pair[0];
    const meta = pair[1];
    if (!Array.isArray(raw)) throw new Error("timeline is not an array");
    events = sortEvents(raw);
    if (rangeEl) rangeEl.textContent = meta.range || "";
    if (builtEl) builtEl.textContent = meta.built || "";
    if (rulesEl) rulesEl.textContent = meta.rules || "";
    renderThemes(meta.themes || []);
    renderChips(events);
    renderTimeline(events);
    renderVerified(meta.verified || []);
    renderGaps(meta.gaps || []);
    apply();
  }).catch(function (err) {
    fail("Could not load timeline data. " + (err && err.message ? err.message : ""));
  });
})();
