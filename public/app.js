const state = { jobs: [], studios: [], bucket: "local", newOnly: false, q: "" };

const el = {
  meta: document.getElementById("meta"),
  jobs: document.getElementById("jobs"),
  coverage: document.getElementById("coverage"),
  search: document.getElementById("search"),
  newOnly: document.getElementById("newOnly"),
  bucketFilters: document.getElementById("bucketFilters"),
};

function matchesBucket(j) {
  switch (state.bucket) {
    case "seattle": return j.isSeattle;
    case "remote": return j.isRemote && !j.isSeattle;
    case "all": return true;
    case "local":
    default: return j.isSeattle || j.isRemote;
  }
}

function visibleJobs() {
  const q = state.q.trim().toLowerCase();
  return state.jobs
    .filter(matchesBucket)
    .filter((j) => !state.newOnly || j.isNew)
    .filter((j) => !q || j.title.toLowerCase().includes(q) || j.studio.toLowerCase().includes(q))
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || a.studio.localeCompare(b.studio) || a.title.localeCompare(b.title));
}

function jobRow(j) {
  const a = document.createElement("a");
  a.className = "job";
  a.href = j.url || "#";
  a.target = "_blank";
  a.rel = "noopener";

  const locClass = j.isSeattle ? "seattle" : j.isRemote ? "remote" : "";
  a.innerHTML = `
    ${j.isNew ? '<span class="new">NEW</span>' : ""}
    <span class="title"></span>
    <span class="studio"></span>
    <span class="loc ${locClass}"></span>`;
  a.querySelector(".title").textContent = j.title;
  a.querySelector(".studio").textContent = j.studio;
  a.querySelector(".loc").textContent = j.locationText || (j.isRemote ? "Remote" : "—");
  return a;
}

function render() {
  const jobs = visibleJobs();
  el.jobs.replaceChildren();
  if (jobs.length === 0) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = "No matching jobs. Try a wider filter, or run `npm run radar` to refresh.";
    el.jobs.append(d);
  } else {
    jobs.forEach((j) => el.jobs.append(jobRow(j)));
  }

  const newCount = state.jobs.filter((j) => j.isNew).length;
  el.meta.textContent =
    `${jobs.length} shown · ${newCount} new since last refresh · ` +
    `last updated ${state.generatedAt ? new Date(state.generatedAt).toLocaleString() : "—"}`;
}

function renderCoverage() {
  const total = state.studios.reduce((n, s) => n + s.count, 0);
  el.coverage.innerHTML = `<h2>Coverage — ${state.studios.length} studios, ${total} jobs</h2><div class="cov-grid"></div>`;
  const grid = el.coverage.querySelector(".cov-grid");
  for (const s of state.studios) {
    const div = document.createElement("div");
    div.className = "cov" + (s.error ? " err" : s.kind === "manual" ? " manual" : "");
    const name = document.createElement("span");
    name.textContent = s.name;
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = s.error ? "error" : s.kind === "manual" ? "check by hand" : `${s.count}`;
    div.append(name, n);
    grid.append(div);
  }
}

async function load() {
  const res = await fetch("/api/jobs");
  if (!res.ok) {
    el.meta.textContent = "No data yet — run `npm run radar`, then refresh.";
    return;
  }
  const snap = await res.json();
  state.jobs = snap.jobs ?? [];
  state.studios = snap.studios ?? [];
  state.generatedAt = snap.generatedAt;
  render();
  renderCoverage();
}

el.search.addEventListener("input", () => { state.q = el.search.value; render(); });
el.newOnly.addEventListener("change", () => { state.newOnly = el.newOnly.checked; render(); });
el.bucketFilters.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  state.bucket = btn.dataset.bucket;
  [...el.bucketFilters.children].forEach((b) => b.classList.toggle("active", b === btn));
  render();
});

load();
