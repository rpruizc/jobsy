const $ = (id) => document.getElementById(id);
let mode = "login"; // or "register"

// ---------- helpers ----------
function relTime(iso) {
  if (!iso) return "";
  const mins = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.round(hrs)}h ago`;
  const days = hrs / 24;
  if (days < 30) return `${Math.round(days)}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}
function isFresh(iso) {
  return iso && Date.now() - new Date(iso).getTime() < 24 * 3600 * 1000;
}
function salaryText(j) {
  if (!j.salaryMin && !j.salaryMax) return null;
  const f = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  const cur = j.salaryCurrency && j.salaryCurrency !== "USD" ? ` ${j.salaryCurrency}` : "";
  const range = j.salaryMin && j.salaryMax ? `${f(j.salaryMin)}–${f(j.salaryMax)}` : f(j.salaryMin || j.salaryMax);
  return `${range}${cur}${j.salaryPeriod ? `/${j.salaryPeriod}` : ""}`;
}

function jobEl(j) {
  const a = document.createElement("a");
  a.className = "job" + (isFresh(j.firstSeenAt) ? " fresh" : "");
  a.href = j.url || "#";
  a.target = "_blank";
  a.rel = "noopener";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = j.title;

  const age = document.createElement("div");
  age.className = "age" + (isFresh(j.firstSeenAt) ? " fresh" : "");
  age.textContent = relTime(j.firstSeenAt);

  const company = document.createElement("div");
  company.className = "company";
  company.textContent = j.company || "Employer not disclosed";

  const meta = document.createElement("div");
  meta.className = "meta-row";
  const chips = [];
  if (j.location) chips.push(["chip", j.location]);
  if (j.workplaceType) chips.push(["chip remote", j.workplaceType.replace("_", "-")]);
  const sal = salaryText(j);
  if (sal) chips.push(["chip salary", sal]);
  if (j.employmentType) chips.push(["chip", j.employmentType.replace("_", " ")]);
  for (const [cls, text] of chips) {
    const c = document.createElement("span");
    c.className = cls;
    c.textContent = text;
    meta.appendChild(c);
  }

  a.append(title, age, company, meta);
  return a;
}

function renderResults(jobs, total, { newJobs } = {}) {
  const results = $("results");
  results.replaceChildren();

  if (newJobs && newJobs.length) {
    const label = document.createElement("div");
    label.className = "section-label";
    label.textContent = `★ ${newJobs.length} new since you last looked`;
    results.appendChild(label);
    newJobs.forEach((j) => results.appendChild(jobEl(j)));
    const rest = document.createElement("div");
    rest.className = "section-label";
    rest.style.color = "var(--muted)";
    rest.textContent = "Everything else";
    results.appendChild(rest);
  }

  if (!jobs.length) {
    const e = document.createElement("div");
    e.className = "empty";
    e.textContent = "No jobs match. Try widening the filters or the time window.";
    results.appendChild(e);
    return;
  }
  jobs.forEach((j) => results.appendChild(jobEl(j)));
}

function currentParams() {
  return {
    q: $("q").value.trim(),
    location: $("location").value.trim(),
    workplaceType: $("workplaceType").value,
    employmentType: $("employmentType").value,
    salaryMin: $("salaryMin").value,
    postedWithinHours: $("postedWithinHours").value,
    namedOnly: $("namedOnly").checked ? "true" : "",
  };
}
function applyParams(p = {}) {
  $("q").value = p.q || "";
  $("location").value = p.location || "";
  $("workplaceType").value = p.workplaceType || "";
  $("employmentType").value = p.employmentType || "";
  $("salaryMin").value = p.salaryMin || "";
  $("postedWithinHours").value = p.postedWithinHours || "";
  $("namedOnly").checked = !!p.namedOnly;
}

// ---------- actions ----------
async function runSearch() {
  $("resultsMeta").textContent = "Searching…";
  try {
    const { jobs, total } = await api.search(currentParams());
    $("resultsMeta").textContent =
      `${total != null ? total.toLocaleString() : jobs.length}+ matches · showing ${jobs.length} · newest first`;
    renderResults(jobs, total);
  } catch (err) {
    $("resultsMeta").textContent = err.message;
  }
}

async function loadSaved() {
  const { saved } = await api.savedList();
  const list = $("savedList");
  list.replaceChildren();
  $("savedEmpty").classList.toggle("hidden", saved.length > 0);
  for (const s of saved) {
    const li = document.createElement("li");
    li.className = "saved-item";
    const left = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = s.name;
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = describe(s.params);
    left.append(name, sub);

    const badge = document.createElement("span");
    badge.className = "badge" + (s.newCount ? "" : " zero");
    badge.textContent = s.newCount || 0;

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "×";
    del.title = "Delete";
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      await api.savedDelete(s.id);
      loadSaved();
    });

    li.append(left, badge, del);
    li.addEventListener("click", () => openSaved(s.id));
    list.appendChild(li);
  }
}

function describe(p) {
  const bits = [p.q, p.location, p.workplaceType, p.salaryMin ? `$${Math.round(p.salaryMin / 1000)}k+` : null]
    .filter(Boolean);
  return bits.length ? bits.join(" · ") : "all jobs";
}

async function openSaved(id) {
  $("resultsMeta").textContent = "Loading saved search…";
  const data = await api.savedView(id);
  applyParams(data.params);
  $("resultsMeta").textContent =
    `${data.name} · ${data.newJobs.length} new · ${data.jobs.length} shown`;
  renderResults(data.jobs, data.total, { newJobs: data.newJobs });
  loadSaved(); // badge resets to 0 after viewing
}

async function saveCurrent() {
  const name = prompt("Name this saved search:", $("q").value || "My search");
  if (!name) return;
  await api.savedCreate(name, currentParams());
  loadSaved();
}

// ---------- auth ----------
function showApp(user) {
  $("auth").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("who").textContent = user.email;
  loadSaved();
  runSearch();
}
function showAuth() {
  $("app").classList.add("hidden");
  $("auth").classList.remove("hidden");
}
function setMode(m) {
  mode = m;
  $("tabLogin").classList.toggle("active", m === "login");
  $("tabRegister").classList.toggle("active", m === "register");
  $("authSubmit").textContent = m === "login" ? "Sign in" : "Create account";
  $("password").autocomplete = m === "login" ? "current-password" : "new-password";
  $("authError").textContent = "";
}

$("tabLogin").addEventListener("click", () => setMode("login"));
$("tabRegister").addEventListener("click", () => setMode("register"));
$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    const { user } = mode === "login" ? await api.login(email, password) : await api.register(email, password);
    showApp(user);
  } catch (err) {
    $("authError").textContent = err.message;
  }
});
$("logout").addEventListener("click", async () => {
  await api.logout();
  showAuth();
});

$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch();
});
$("saveBtn").addEventListener("click", saveCurrent);
$("namedOnly").addEventListener("change", runSearch);

// ---------- boot ----------
(async () => {
  try {
    const { user } = await api.me();
    if (user) showApp(user);
    else showAuth();
  } catch {
    showAuth();
  }
})();
