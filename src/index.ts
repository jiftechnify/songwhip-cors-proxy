import { Hono } from "hono";
import { cache } from "hono/cache";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

type SongWhipResp = {
  name?: string;
  artists?: {
    name?: string;
  }[];
  url?: string;
};

type MusicData = {
  url: string;
  title?: string;
  artists?: string[];
};

const app = new Hono();

app.get(
  "*",
  cors({
    origin: (origin) =>
      origin.startsWith("https://nostatus") && origin.endsWith(".vercel.app") || origin.includes("localhost:")
        ? origin
        : undefined,
    allowMethods: ["GET"],
  })
);

app.get(
  "*",
  cache({
    cacheName: "cache",
  })
);

app.get("/", async (c) => {
  const musicLinkUrl = c.req.query("url");

  console.log(
    "forwarding request to SongWhip API... (music URL: %s)",
    musicLinkUrl
  );
  const resp = await fetch("https://songwhip.com/", {
    method: "POST",
    body: JSON.stringify({ url: musicLinkUrl }),
  });
  if (!resp.ok) {
    throw new HTTPException(resp.status, { message: resp.statusText });
  }

  const swResp = (await resp.json()) as SongWhipResp;
  if (swResp.url === undefined) {
    throw new HTTPException(400, { message: "Bad Request" });
  }

  const musicData: MusicData = {
    url: swResp.url,
    title: swResp.name,
    artists:
      swResp.artists?.flatMap((a) => (a.name ? [a.name] : [])) ?? undefined,
  };
  console.log("music data for %s: %O", musicLinkUrl, musicData);

  return c.json(musicData);
});

export default app;
