export default async (req) => {
  const token = Netlify.env.get("TMDB_TOKEN");
  if (!token) return reply({ error: "TMDB_TOKEN is not set" }, 500);

  const q = (new URL(req.url).searchParams.get("query") || "").trim().slice(0, 100);
  if (!q) return reply({ results: [] });

  const url =
    "https://api.themoviedb.org/3/search/movie" +
    `?query=${encodeURIComponent(q)}&language=th-TH&region=TH&include_adult=false`;

  try {
    const r = await fetch(url, {
      headers: { accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    return reply(data, r.status, { "Cache-Control": "public, max-age=3600" });
  } catch (e) {
    return reply({ error: "upstream error" }, 502);
  }
};

function reply(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

export const config = { path: "/api/tmdb" };
