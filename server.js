const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

const API_BASE =
  "https://sportscore.com/api/v1/fixtures/";

const MATCH_API =
  "https://sportscore.com/api/v1/match/";


/* =========================================
   FETCH JSON
========================================= */

async function fetchJSON(url) {

  console.log("Fetching:", url);

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Football-Fan-Zone/1.0"
    }
  });

  if (!response.ok) {

    throw new Error(
      "API error: " + response.status
    );

  }

  return await response.json();
}


/* =========================================
   SPORTS API
========================================= */

async function getMatches(
  sport,
  status,
  date
) {

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

  if (status) {

    url +=
      "&status=" +
      encodeURIComponent(status);

  }

  /*
    Cache busting
    যাতে পুরোনো response না আসে
  */

  url +=
    "&_=" +
    Date.now();

  return await fetchJSON(url);
}


/* =========================================
   SINGLE MATCH
========================================= */

async function getMatchDetails(
  sport,
  slug
) {

  const url =
    MATCH_API +
    "?sport=" +
    encodeURIComponent(sport) +
    "&slug=" +
    encodeURIComponent(slug) +
    "&_=" +
    Date.now();

  return await fetchJSON(url);
}


/* =========================================
   JSON
========================================= */

function sendJSON(
  res,
  statusCode,
  data
) {

  res.writeHead(
    statusCode,
    {
      "Content-Type":
        "application/json; charset=utf-8",

      "Access-Control-Allow-Origin":
        "*",

      "Cache-Control":
        "no-store, no-cache, must-revalidate",

      "Pragma":
        "no-cache",

      "Expires":
        "0"
    }
  );

  res.end(
    JSON.stringify(data)
  );
}


/* =========================================
   STATIC FILE
========================================= */

function serveFile(
  req,
  res
) {

  let requestedPath =
    req.url.split("?")[0];

  if (
    requestedPath === "/" ||
    requestedPath === ""
  ) {

    requestedPath =
      "/index.html";

  }

  const safePath =
    path.normalize(
      requestedPath
    );

  const filePath =
    path.join(
      __dirname,
      safePath
    );

  if (
    !filePath.startsWith(
      __dirname
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

      let contentType =
        "text/html; charset=utf-8";

      if (
        filePath.endsWith(".css")
      ) {

        contentType =
          "text/css; charset=utf-8";

      }

      if (
        filePath.endsWith(".js")
      ) {

        contentType =
          "application/javascript; charset=utf-8";

      }

      if (
        filePath.endsWith(".json")
      ) {

        contentType =
          "application/json; charset=utf-8";

      }

      res.writeHead(
        200,
        {
          "Content-Type":
            contentType,

          "Cache-Control":
            "no-cache, no-store, must-revalidate"
        }
      );

      res.end(data);

    }
  );
}


/* =========================================
   SERVER
========================================= */

const server =
  http.createServer(
    async (req, res) => {

      try {

        /* =================================
           HEALTH
        ================================= */

        if (
          req.url === "/health"
        ) {

          sendJSON(
            res,
            200,
            {
              status: "ok",

              app:
                "Football Fan Zone",

              football:
                true,

              cricket:
                true,

              live_score:
                true,

              scorecard:
                true,

              notifications:
                true,

              auto_refresh:
                true
            }
          );

          return;
        }


        /* =================================
           MATCH DETAILS
        ================================= */

        if (
          req.url.startsWith(
            "/api/match"
          )
        ) {

          const url =
            new URL(
              req.url,
              "http://localhost"
            );

          const sport =
            url.searchParams.get(
              "sport"
            );

          const slug =
            url.searchParams.get(
              "slug"
            );

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


        /* =================================
           FOOTBALL
        ================================= */

        if (
          req.url.startsWith(
            "/api/football"
          )
        ) {

          const url =
            new URL(
              req.url,
              "http://localhost"
            );

          let status =
            url.searchParams.get(
              "status"
            );

          const date =
            url.searchParams.get(
              "date"
            );

          if (!status) {

            const filter =
              url.searchParams.get(
                "filter"
              );

            if (
              filter === "live" ||
              filter === "finished" ||
              filter === "upcoming"
            ) {

              status =
                filter;

            }
          }

          const data =
            await getMatches(
              "football",
              status,
              date
            );

          sendJSON(
            res,
            200,
            data
          );

          return;
        }


        /* =================================
           CRICKET
        ================================= */

        if (
          req.url.startsWith(
            "/api/cricket"
          )
        ) {

          const url =
            new URL(
              req.url,
              "http://localhost"
            );

          let status =
            url.searchParams.get(
              "status"
            );

          const date =
            url.searchParams.get(
              "date"
            );

          if (!status) {

            const filter =
              url.searchParams.get(
                "filter"
              );

            if (
              filter === "live" ||
              filter === "finished" ||
              filter === "upcoming"
            ) {

              status =
                filter;

            }
          }

          const data =
            await getMatches(
              "cricket",
              status,
              date
            );

          sendJSON(
            res,
            200,
            data
          );

          return;
        }


        /* =================================
           STATIC
        ================================= */

        serveFile(
          req,
          res
        );

      }

      catch (error) {

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
              error.message
          }
        );

      }

    }
  );


/* =========================================
   START
========================================= */

server.listen(
  PORT,
  () => {

    console.log(
      "Football Fan Zone server started on port " +
      PORT
    );

  }
);