const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

const API_BASE =
  "https://sportscore.com/api/v1/fixtures/";

const MATCH_API =
  "https://sportscore.com/api/v1/match/";

async function fetchJSON(url) {
  console.log("Fetching API:");
  console.log(url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 Football-Fan-Zone"
    },
    cache: "no-store"
  });

  const text = await response.text();

  console.log("API STATUS:", response.status);
  console.log("API RESPONSE:", text.substring(0, 500));

  if (!response.ok) {
    throw new Error(
      "Upstream API error: HTTP " + response.status
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("API JSON পাওয়া যায়নি");
  }
}


/* ================================
   MATCH LIST
================================ */

async function getMatches(sport, date) {

  let url =
    API_BASE +
    "?sport=" +
    encodeURIComponent(sport);

  if (date) {
    url +=
      "&date=" +
      encodeURIComponent(date);
  }

  url += "&limit=200";
  url += "&_=" + Date.now();

  return await fetchJSON(url);
}


/* ================================
   MATCH DETAILS
================================ */

async function getMatchDetails(sport, slug) {

  let matchId = String(slug || "").trim();

  /*
     যদি ভুল করে পুরো URL আসে,
     তাহলে শুধু শেষ ID নেওয়া হবে
  */

  if (matchId.includes("/")) {

    const parts =
      matchId
        .split("/")
        .filter(Boolean);

    if (parts.length) {
      matchId =
        parts[parts.length - 1];
    }
  }

  matchId =
    matchId.replace(
      /^\/+|\/+$/g,
      ""
    );

  if (!matchId) {
    throw new Error(
      "Match ID পাওয়া যায়নি"
    );
  }

  const url =
    MATCH_API +
    "?sport=" +
    encodeURIComponent(sport) +
    "&slug=" +
    encodeURIComponent(matchId) +
    "&_=" +
    Date.now();

  console.log("==============================");
  console.log("DETAIL MATCH ID:", matchId);
  console.log("DETAIL API:", url);
  console.log("==============================");

  return await fetchJSON(url);
}


/* ================================
   JSON RESPONSE
================================ */

function sendJSON(res, statusCode, data) {

  res.writeHead(statusCode, {
    "Content-Type":
      "application/json; charset=utf-8",

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods":
      "GET, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type",

    "Cache-Control":
      "no-store, no-cache, must-revalidate",

    "Pragma": "no-cache",

    "Expires": "0"
  });

  res.end(
    JSON.stringify(data)
  );
}


/* ================================
   CONTENT TYPE
================================ */

function getContentType(filePath) {

  const ext =
    path.extname(filePath)
      .toLowerCase();

  const types = {

    ".html":
      "text/html; charset=utf-8",

    ".css":
      "text/css; charset=utf-8",

    ".js":
      "application/javascript; charset=utf-8",

    ".json":
      "application/json; charset=utf-8",

    ".png":
      "image/png",

    ".jpg":
      "image/jpeg",

    ".jpeg":
      "image/jpeg",

    ".gif":
      "image/gif",

    ".svg":
      "image/svg+xml",

    ".webp":
      "image/webp",

    ".ico":
      "image/x-icon"
  };

  return (
    types[ext] ||
    "application/octet-stream"
  );
}


/* ================================
   STATIC FILE
================================ */

function serveFile(req, res) {

  let requestedPath =
    req.url.split("?")[0];

  if (
    requestedPath === "/" ||
    requestedPath === ""
  ) {
    requestedPath =
      "/index.html";
  }

  try {

    requestedPath =
      decodeURIComponent(
        requestedPath
      );

  } catch {

    res.writeHead(400);
    res.end("Bad Request");

    return;
  }


  const cleanPath =
    requestedPath.replace(
      /^\/+/,
      ""
    );


  const root =
    path.resolve(__dirname);

  const filePath =
    path.resolve(
      path.join(
        __dirname,
        cleanPath
      )
    );


  if (
    !filePath.startsWith(
      root + path.sep
    )
  ) {

    res.writeHead(403);
    res.end("Forbidden");

    return;
  }


  fs.readFile(
    filePath,
    (error, data) => {

      if (error) {

        res.writeHead(
          404,
          {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        );

        res.end(
          "404 - File Not Found"
        );

        return;
      }


      res.writeHead(
        200,
        {
          "Content-Type":
            getContentType(
              filePath
            ),

          "Cache-Control":
            "no-cache, no-store, must-revalidate"
        }
      );


      res.end(data);
    }
  );
}


/* ================================
   SERVER
================================ */

const server =
  http.createServer(
    async (req, res) => {

      try {

        if (
          req.method ===
          "OPTIONS"
        ) {

          res.writeHead(
            204,
            {
              "Access-Control-Allow-Origin":
                "*",

              "Access-Control-Allow-Methods":
                "GET, OPTIONS",

              "Access-Control-Allow-Headers":
                "Content-Type"
            }
          );

          res.end();

          return;
        }


        const url =
          new URL(
            req.url,
            `http://localhost:${PORT}`
          );


        const pathname =
          url.pathname;


        console.log(
          `${req.method} ${pathname}${url.search}`
        );


        /* =========================
           HEALTH
        ========================= */

        if (
          pathname ===
          "/health"
        ) {

          sendJSON(
            res,
            200,
            {
              status: "ok",

              app:
                "Football Fan Zone",

              football: true,

              cricket: true,

              live_score: true,

              match_details: true,

              scorecard: true,

              incidents: true,

              lineups: true,

              timestamp:
                new Date()
                  .toISOString()
            }
          );

          return;
        }


        /* =========================
           FOOTBALL
        ========================= */

        if (
          pathname ===
          "/api/football"
        ) {

          const date =
            url.searchParams.get(
              "date"
            );

          const data =
            await getMatches(
              "football",
              date
            );

          sendJSON(
            res,
            200,
            data
          );

          return;
        }


        /* =========================
           CRICKET
        ========================= */

        if (
          pathname ===
          "/api/cricket"
        ) {

          const date =
            url.searchParams.get(
              "date"
            );

          const data =
            await getMatches(
              "cricket",
              date
            );

          sendJSON(
            res,
            200,
            data
          );

          return;
        }


        /* =========================
           MATCH DETAILS
        ========================= */

        if (
          pathname ===
          "/api/match"
        ) {

          const sport =
            url.searchParams.get(
              "sport"
            );

          let slug =
            url.searchParams.get(
              "slug"
            );


          if (!slug) {

            slug =
              url.searchParams.get(
                "id"
              );
          }


          if (
            !sport ||
            !slug
          ) {

            sendJSON(
              res,
              400,
              {
                success: false,

                error:
                  "sport এবং slug প্রয়োজন"
              }
            );

            return;
          }


          if (
            sport !== "football" &&
            sport !== "cricket"
          ) {

            sendJSON(
              res,
              400,
              {
                success: false,

                error:
                  "sport অবশ্যই football অথবা cricket হতে হবে"
              }
            );

            return;
          }


          const data =
            await getMatchDetails(
              sport,
              slug
            );


          sendJSON(
            res,
            200,
            data
          );

          return;
        }


        /* =========================
           FAVICON
        ========================= */

        if (
          pathname ===
          "/favicon.ico"
        ) {

          res.writeHead(204);
          res.end();

          return;
        }


        /* =========================
           STATIC
        ========================= */

        serveFile(
          req,
          res
        );

      } catch (error) {

        console.error(
          "SERVER ERROR:",
          error
        );


        sendJSON(
          res,
          500,
          {
            success: false,

            error:
              "Server error",

            message:
              error.message,

            timestamp:
              new Date()
                .toISOString()
          }
        );
      }
    }
  );


/* ================================
   START
================================ */

server.listen(
  PORT,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "Football Fan Zone Server Started"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "Football API: /api/football"
    );

    console.log(
      "Cricket API: /api/cricket"
    );

    console.log(
      "Match API: /api/match"
    );

    console.log(
      "Health: /health"
    );

    console.log(
      "================================="
    );
  }
);


/* ================================
   ERROR HANDLERS
================================ */

process.on(
  "uncaughtException",
  error => {

    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );
  }
);


process.on(
  "unhandledRejection",
  error => {

    console.error(
      "UNHANDLED REJECTION:",
      error
    );
  }
);