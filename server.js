const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

const API_BASE =
  "https://sportscore.com/api/v1/fixtures/";

const MATCH_API =
  "https://sportscore.com/api/v1/match/";


/* =========================================
   SPORTS API
========================================= */

async function getMatches(sport, status) {

  let url =
    API_BASE +
    "?sport=" +
    encodeURIComponent(sport) +
    "&limit=100";

  if (status) {

    url +=
      "&status=" +
      encodeURIComponent(status);

  }

  console.log("Fetching:", url);

  const response =
    await fetch(url);

  if (!response.ok) {

    throw new Error(
      "SportScore API error: " +
      response.status
    );

  }

  return await response.json();

}


/* =========================================
   SINGLE MATCH DETAILS
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
    encodeURIComponent(slug);

  console.log(
    "Fetching match:",
    url
  );

  const response =
    await fetch(url);

  if (!response.ok) {

    throw new Error(
      "Match API error: " +
      response.status
    );

  }

  return await response.json();

}


/* =========================================
   JSON RESPONSE
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
        "no-store"

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

  const filePath =
    path.join(
      __dirname,
      requestedPath
    );


  if (
    !filePath.startsWith(
      __dirname
    )
  ) {

    res.writeHead(403);

    res.end(
      "Forbidden"
    );

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
            "no-cache"

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


      /* ===============================
         HEALTH
      =============================== */

      if (
        req.url === "/health"
      ) {

        sendJSON(
          res,
          200,
          {

            status: "ok",

            app: "Football Fan Zone",

            football: true,

            cricket: true,

            match_details: true

          }
        );

        return;

      }


      /* ===============================
         SINGLE MATCH DETAILS
      =============================== */

      if (
        req.url.startsWith(
          "/api/match"
        )
      ) {

        try {

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


        } catch (error) {

          console.error(
            "Match details error:",
            error
          );


          sendJSON(
            res,
            500,
            {

              success: false,

              error:
                "Match details পাওয়া যাচ্ছে না",

              message:
                error.message

            }
          );

        }

        return;

      }


      /* ===============================
         FOOTBALL
      =============================== */

      if (
        req.url.startsWith(
          "/api/football"
        )
      ) {

        try {

          const url =
            new URL(
              req.url,
              "http://localhost"
            );


          let status =
            url.searchParams.get(
              "status"
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
              status
            );


          sendJSON(
            res,
            200,
            data
          );


        } catch (error) {

          console.error(
            "Football error:",
            error
          );


          sendJSON(
            res,
            500,
            {

              success: false,

              error:
                "Football data পাওয়া যাচ্ছে না",

              message:
                error.message

            }
          );

        }

        return;

      }


      /* ===============================
         CRICKET
      =============================== */

      if (
        req.url.startsWith(
          "/api/cricket"
        )
      ) {

        try {

          const url =
            new URL(
              req.url,
              "http://localhost"
            );


          let status =
            url.searchParams.get(
              "status"
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
              status
            );


          sendJSON(
            res,
            200,
            data
          );


        } catch (error) {

          console.error(
            "Cricket error:",
            error
          );


          sendJSON(
            res,
            500,
            {

              success: false,

              error:
                "Cricket data পাওয়া যাচ্ছে না",

              message:
                error.message

            }
          );

        }

        return;

      }


      /* ===============================
         STATIC WEBSITE
      =============================== */

      serveFile(
        req,
        res
      );

    }
  );


/* =========================================
   START SERVER
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