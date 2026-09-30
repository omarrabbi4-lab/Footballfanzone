const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

/* =========================================
   SPORT SCORE API
========================================= */

const API_BASE =
  "https://sportscore.com/api/v1/fixtures/";

const MATCH_API =
  "https://sportscore.com/api/v1/match/";

/*
  SportScore data is edge-cached.
  We keep our own short cache so the server
  can refresh regularly without hammering API.
*/

const CACHE_TTL = 15000; // 15 seconds

const cache = new Map();

const lastSuccessful = new Map();


/* =========================================
   TIME
========================================= */

function nowISO() {
  return new Date().toISOString();
}


/* =========================================
   CACHE KEY
========================================= */

function makeCacheKey(
  sport,
  status,
  date
) {

  return [
    sport || "",
    status || "",
    date || ""
  ].join("|");

}


/* =========================================
   FETCH JSON
========================================= */

async function fetchJSON(url) {

  const response =
    await fetch(
      url,
      {
        headers: {
          "Accept":
            "application/json",

          "User-Agent":
            "Football-Fan-Zone/1.0"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      "SportScore API error: " +
      response.status
    );

  }


  return await response.json();

}


/* =========================================
   GET MATCHES
========================================= */

async function getMatches(
  sport,
  status,
  date
) {

  const key =
    makeCacheKey(
      sport,
      status,
      date
    );


  const cached =
    cache.get(key);


  /*
    Return fresh cache
  */

  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TTL
  ) {

    return {
      ...cached.data,

      _server: {
        cached: true,
        updated:
          cached.updated
      }
    };

  }


  let url =
    API_BASE +
    "?sport=" +
    encodeURIComponent(
      sport
    );


  /*
    DATE
  */

  if (date) {

    url +=
      "&date=" +
      encodeURIComponent(
        date
      );

  }


  /*
    LIMIT
  */

  url +=
    "&limit=200";


  /*
    STATUS
  */

  if (status) {

    url +=
      "&status=" +
      encodeURIComponent(
        status
      );

  }


  console.log(
    "[" +
      nowISO() +
      "] Fetching:",
    url
  );


  try {

    const data =
      await fetchJSON(
        url
      );


    /*
      Save cache
    */

    cache.set(
      key,
      {
        data: data,
        time: Date.now(),
        updated: nowISO()
      }
    );


    /*
      Save last successful
      response
    */

    lastSuccessful.set(
      key,
      data
    );


    return {
      ...data,

      _server: {
        cached: false,
        updated: nowISO()
      }
    };


  } catch (error) {

    console.error(
      "API fetch failed:",
      error.message
    );


    /*
      If API temporarily fails,
      return last successful data.
    */

    if (
      lastSuccessful.has(key)
    ) {

      return {
        ...lastSuccessful.get(
          key
        ),

        _server: {
          cached: true,
          stale: true,
          updated:
            nowISO()
        }
      };

    }


    throw error;

  }

}


/* =========================================
   SINGLE MATCH DETAILS
========================================= */

async function getMatchDetails(
  sport,
  slug
) {

  const key =
    "match|" +
    sport +
    "|" +
    slug;


  const cached =
    cache.get(key);


  /*
    Short cache for match details
  */

  if (
    cached &&
    Date.now() - cached.time <
      10000
  ) {

    return {
      ...cached.data,

      _server: {
        cached: true,
        updated:
          cached.updated
      }
    };

  }


  const url =
    MATCH_API +
    "?sport=" +
    encodeURIComponent(
      sport
    ) +
    "&slug=" +
    encodeURIComponent(
      slug
    );


  console.log(
    "[" +
      nowISO() +
      "] Fetching match:",
    url
  );


  try {

    const data =
      await fetchJSON(
        url
      );


    cache.set(
      key,
      {
        data: data,
        time: Date.now(),
        updated: nowISO()
      }
    );


    lastSuccessful.set(
      key,
      data
    );


    return {
      ...data,

      _server: {
        cached: false,
        updated: nowISO()
      }
    };


  } catch (error) {

    console.error(
      "Match detail error:",
      error.message
    );


    if (
      lastSuccessful.has(key)
    ) {

      return {
        ...lastSuccessful.get(
          key
        ),

        _server: {
          cached: true,
          stale: true,
          updated:
            nowISO()
        }
      };

    }


    throw error;

  }

}


/* =========================================
   SEND JSON
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

      "Access-Control-Allow-Methods":
        "GET, OPTIONS",

      "Access-Control-Allow-Headers":
        "Content-Type",

      "Cache-Control":
        "no-store"

    }
  );


  res.end(
    JSON.stringify(
      data
    )
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


  /*
    Prevent path traversal
  */

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

    res.writeHead(
      403
    );

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
        filePath.endsWith(
          ".css"
        )
      ) {

        contentType =
          "text/css; charset=utf-8";

      }


      else if (
        filePath.endsWith(
          ".js"
        )
      ) {

        contentType =
          "application/javascript; charset=utf-8";

      }


      else if (
        filePath.endsWith(
          ".json"
        )
      ) {

        contentType =
          "application/json; charset=utf-8";

      }


      else if (
        filePath.endsWith(
          ".png"
        )
      ) {

        contentType =
          "image/png";

      }


      else if (
        filePath.endsWith(
          ".jpg"
        ) ||
        filePath.endsWith(
          ".jpeg"
        )
      ) {

        contentType =
          "image/jpeg";

      }


      else if (
        filePath.endsWith(
          ".svg"
        )
      ) {

        contentType =
          "image/svg+xml";

      }


      else if (
        filePath.endsWith(
          ".webp"
        )
      ) {

        contentType =
          "image/webp";

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


      res.end(
        data
      );

    }
  );

}


/* =========================================
   BACKGROUND REFRESH
========================================= */

/*
  Refresh live football/cricket data
  automatically every 15 seconds.

  This does NOT replace the API's own
  refresh interval; it simply keeps our
  server cache warm.
*/

async function refreshLiveData() {

  const sports = [
    "football",
    "cricket"
  ];


  for (
    const sport of sports
  ) {

    const key =
      makeCacheKey(
        sport,
        "live",
        ""
      );


    try {

      const url =
        API_BASE +
        "?sport=" +
        encodeURIComponent(
          sport
        ) +
        "&status=live" +
        "&limit=200";


      console.log(
        "[" +
          nowISO() +
          "] Background refresh:",
        sport
      );


      const data =
        await fetchJSON(
          url
        );


      cache.set(
        key,
        {
          data: data,
          time: Date.now(),
          updated: nowISO()
        }
      );


      lastSuccessful.set(
        key,
        data
      );


    } catch (error) {

      console.error(
        "Background refresh failed:",
        sport,
        error.message
      );

    }

  }

}


/* =========================================
   AUTO REFRESH
========================================= */

const refreshTimer =
  setInterval(
    refreshLiveData,
    15000
  );


/*
  Don't keep Node process alive
  only because of timer during shutdown.
*/

if (
  refreshTimer.unref
) {

  refreshTimer.unref();

}


/* =========================================
   HTTP SERVER
========================================= */

const server =
  http.createServer(
    async (
      req,
      res
    ) => {

      /*
        CORS preflight
      */

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


      /* =====================================
         HEALTH
      ===================================== */

      if (
        req.url ===
        "/health"
      ) {

        sendJSON(
          res,
          200,
          {

            status:
              "ok",

            app:
              "Football Fan Zone",

            football:
              true,

            cricket:
              true,

            match_details:
              true,

            date_filter:
              true,

            realtime:
              true,

            refresh_interval:
              "15 seconds",

            cache_ttl:
              "15 seconds",

            server_time:
              nowISO()

          }
        );


        return;

      }


      /* =====================================
         MATCH DETAILS
      ===================================== */

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

                success:
                  false,

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


        } catch (
          error
        ) {

          console.error(
            "Match details error:",
            error
          );


          sendJSON(
            res,
            500,
            {

              success:
                false,

              error:
                "Match details পাওয়া যাচ্ছে না",

              message:
                error.message

            }
          );

        }


        return;

      }


      /* =====================================
         FOOTBALL
      ===================================== */

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


          let date =
            url.searchParams.get(
              "date"
            );


          /*
            Old filter support
          */

          if (
            !status
          ) {

            const filter =
              url.searchParams.get(
                "filter"
              );


            if (
              filter ===
                "live" ||
              filter ===
                "finished" ||
              filter ===
                "upcoming"
            ) {

              status =
                filter;

            }

          }


          /*
            Get data
          */

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


        } catch (
          error
        ) {

          console.error(
            "Football error:",
            error
          );


          sendJSON(
            res,
            500,
            {

              success:
                false,

              error:
                "Football data পাওয়া যাচ্ছে না",

              message:
                error.message

            }
          );

        }


        return;

      }


      /* =====================================
         CRICKET
      ===================================== */

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


          let date =
            url.searchParams.get(
              "date"
            );


          /*
            Old filter support
          */

          if (
            !status
          ) {

            const filter =
              url.searchParams.get(
                "filter"
              );


            if (
              filter ===
                "live" ||
              filter ===
                "finished" ||
              filter ===
                "upcoming"
            ) {

              status =
                filter;

            }

          }


          /*
            Get cricket data
          */

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


        } catch (
          error
        ) {

          console.error(
            "Cricket error:",
            error
          );


          sendJSON(
            res,
            500,
            {

              success:
                false,

              error:
                "Cricket data পাওয়া যাচ্ছে না",

              message:
                error.message

            }
          );

        }


        return;

      }


      /* =====================================
         STATIC WEBSITE
      ===================================== */

      serveFile(
        req,
        res
      );

    }
  );


/* =========================================
   SERVER ERROR HANDLING
========================================= */

server.on(
  "error",
  (error) => {

    console.error(
      "SERVER ERROR:",
      error
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
      "================================="
    );

    console.log(
      "Football Fan Zone server started"
    );

    console.log(
      "Port:",
      PORT
    );

    console.log(
      "Realtime refresh: 15 seconds"
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

    /*
      Initial background refresh
    */

    refreshLiveData();

  }
);


/* =========================================
   GRACEFUL SHUTDOWN
========================================= */

function shutdown() {

  console.log(
    "Shutting down server..."
  );


  clearInterval(
    refreshTimer
  );


  server.close(
    () => {

      process.exit(
        0
      );

    }
  );

}


process.on(
  "SIGTERM",
  shutdown
);

process.on(
  "SIGINT",
  shutdown
);