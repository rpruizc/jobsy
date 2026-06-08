// Tiny fetch wrapper. Cookies ride along automatically (same-origin).
const api = {
  async req(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  },
  get(path) { return this.req("GET", path); },
  post(path, body) { return this.req("POST", path, body); },
  del(path) { return this.req("DELETE", path); },

  me() { return this.get("/api/auth/me"); },
  register(email, password) { return this.post("/api/auth/register", { email, password }); },
  login(email, password) { return this.post("/api/auth/login", { email, password }); },
  logout() { return this.post("/api/auth/logout"); },

  search(params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== "" && v != null) qs.set(k, v);
    return this.get(`/api/search?${qs}`);
  },
  savedList() { return this.get("/api/saved"); },
  savedCreate(name, params) { return this.post("/api/saved", { name, params }); },
  savedView(id) { return this.post(`/api/saved/${id}/view`); },
  savedDelete(id) { return this.del(`/api/saved/${id}`); },
};
