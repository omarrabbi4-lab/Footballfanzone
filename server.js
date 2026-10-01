const http = require("http");
const fs = require("fs");
const path = require("path");


/* =========================================
   SERVER CONFIG
========================================= */

const PORT =
  process.env.PORT || 10000;


/* =========================================
   SPORT API
========================================= */

const API_BASE =
  "https://sportscore.com/api/v1/fixtures/";

const MATCH_API =
  "https://sportscore.com/api/v1/match/";


/* =========================================
   FETCH JSON
========================================= */

async function fetchJSON(url){

  console.log("Fetching API:");

  console.log(url);


  const response =
    await fetch(
      url,
      {
        method:"GET",

        headers:{
          "Accept":
            "application/json",

          "User-Agent":
            "Football-Fan-Zone/2.0"
        },

        cache:"no-store"
      }
    );


  if(!response.ok){

    throw new Error(
      "Upstream API error: HTTP " +
      response.status
    );

  }


  return await response.json();

}


/* =========================================
   GET MATCH LIST
========================================= */

async function getMatches(
  sport,
  status,
  date
){

  let url =
    API_BASE +
    "?sport=" +
    encodeURIComponent(
      sport
    );


  if(date){

    url +=
      "&date=" +
      encodeURIComponent(
        date
      );

  }


  if(status){

    url +=
      "&status=" +
      encodeURIComponent(
        status
      );

  }


  /*
    বেশি ম্যাচ পাওয়ার জন্য
  */

  url +=
    "&limit=200";


  /*
    API/browser cache এড়ানো
  */

  url +=
    "&_=" +
    Date.now();


  return await fetchJSON(
    url
  );

}


/* =========================================
   GET SINGLE MATCH
========================================= */

async function getMatchDetails(
  sport,
  slug
){

  /*
    index.html থেকে সাধারণত:

    dn1m1ghlp9e2moe

    আসবে।

    যদি ভুল করে URL আসে,
    server সেটাও ঠিক করার চেষ্টা করবে।
  */

  let matchId =
    String(
      slug || ""
    ).trim();


  /*
    যদি পুরো URL পাঠানো হয়
  */

  if(
    matchId.includes("/")
  ){

    const parts =
      matchId
        .split("/")
        .filter(Boolean);


    if(parts.length){

      matchId =
        parts[
          parts.length - 1
        ];

    }

  }


  /*
    শেষের slash থাকলে বাদ
  */

  matchId =
    matchId.replace(
      /^\/+|\/+$/g,
      ""
    );


  if(!matchId){

    throw new Error(
      "Match ID পাওয়া যায়নি"
    );

  }


  const url =
    MATCH_API +
    "?sport=" +
    encodeURIComponent(
      sport
    ) +
    "&slug=" +
    encodeURIComponent(
      matchId
    ) +
    "&_=" +
    Date.now();


  console.log(
    "DETAIL MATCH ID:",
    matchId
  );


  console.log(
    "DETAIL API:",
    url
  );


  return await fetchJSON(
    url
  );

}


/* =========================================
   SEND JSON
========================================= */

function sendJSON(
  res,
  statusCode,
  data
){

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
        "no-store, no-cache, must-revalidate, proxy-revalidate",

      "Pragma":
        "no-cache",

      "Expires":
        "0"

    }
  );


  res.end(
    JSON.stringify(
      data
    )
  );

}


/* =========================================
   MIME TYPE
========================================= */

function getContentType(
  filePath
){

  const ext =
    path.extname(
      filePath
    ).toLowerCase();


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
      "image/x-icon",

    ".txt":
      "text/plain; charset=utf-8",

    ".xml":
      "application/xml"

  };


  return (
    types[ext] ||
    "application/octet-stream"
  );

}


/* =========================================
   STATIC FILE SERVER
========================================= */

function serveFile(
  req,
  res
){

  let requestedPath =
    req.url.split("?")[0];


  if(
    requestedPath === "/" ||
    requestedPath === ""
  ){

    requestedPath =
      "/index.html";

  }


  /*
    URL decode
  */

  try{

    requestedPath =
      decodeURIComponent(
        requestedPath
      );

  }catch{

    res.writeHead(
      400,
      {
        "Content-Type":
          "text/plain; charset=utf-8"
      }
    );

    res.end(
      "Bad Request"
    );

    return;

  }


  /*
    Windows/Linux path নিরাপদ রাখা
  */

  const cleanPath =
    requestedPath
      .replace(
        /^\/+/,
        ""
      );


  const filePath =
    path.join(
      __dirname,
      cleanPath
    );


  /*
    Directory traversal protection
  */

  const root =
    path.resolve(
      __dirname
    );

  const resolved =
    path.resolve(
      filePath
    );


  if(
    !resolved.startsWith(
      root + path.sep
    ) &&
    resolved !== root
  ){

    res.writeHead(
      403,
      {
        "Content-Type":
          "text/plain; charset=utf-8"
      }
    );

    res.end(
      "Forbidden"
    );

    return;

  }


  fs.readFile(
    resolved,
    (
      error,
      data
    ) => {

      if(error){

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
              resolved
            ),

          "Cache-Control":
            "no-cache, no-store, must-revalidate",

          "Pragma":
            "no-cache",

          "Expires":
            "0"

        }
      );


      res.end(
        data
      );

    }
  );

}


/* =========================================
   SERVER
========================================= */

const server =
  http.createServer(
    async (
      req,
      res
    ) => {

      try{

        /*
          OPTIONS
        */

        if(
          req.method ===
          "OPTIONS"
        ){

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


        /*
          URL
        */

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


        /* =====================================
           HEALTH
        ===================================== */

        if(
          pathname ===
          "/health"
        ){

          sendJSON(
            res,
            200,
            {

              status:"ok",

              app:
                "Football Fan Zone",

              version:
                "2.0",

              football:true,

              cricket:true,

              live_score:true,

              scorecard:true,

              match_details:true,

              football_incidents:true,

              football_lineups:true,

              football_stats:true,

              notifications:true,

              auto_refresh:true,

              timestamp:
                new Date()
                .toISOString()

            }
          );

          return;

        }


        /* =====================================
           FOOTBALL
        ===================================== */

        if(
          pathname ===
          "/api/football"
        ){

          let status =
            url.searchParams.get(
              "status"
            );


          const filter =
            url.searchParams.get(
              "filter"
            );


          const date =
            url.searchParams.get(
              "date"
            );


          /*
            filter এবং status দুটোই
            support করবে
          */

          if(!status){

            if(
              filter === "live" ||
              filter === "finished" ||
              filter === "upcoming"
            ){

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


        /* =====================================
           CRICKET
        ===================================== */

        if(
          pathname ===
          "/api/cricket"
        ){

          let status =
            url.searchParams.get(
              "status"
            );


          const filter =
            url.searchParams.get(
              "filter"
            );


          const date =
            url.searchParams.get(
              "date"
            );


          if(!status){

            if(
              filter === "live" ||
              filter === "finished" ||
              filter === "upcoming"
            ){

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


        /* =====================================
           SINGLE MATCH DETAILS
        ===================================== */

        if(
          pathname ===
          "/api/match"
        ){

          const sport =
            url.searchParams.get(
              "sport"
            );


          let slug =
            url.searchParams.get(
              "slug"
            );


          /*
            কিছু frontend code-এ
            id পাঠালে সেটাও support করবে
          */

          if(!slug){

            slug =
              url.searchParams.get(
                "id"
              );

          }


          if(
            !sport ||
            !slug
          ){

            sendJSON(
              res,
              400,
              {

                success:false,

                error:
                  "sport এবং slug প্রয়োজন"

              }
            );

            return;

          }


          /*
            Sport validation
          */

          if(
            sport !== "football" &&
            sport !== "cricket"
          ){

            sendJSON(
              res,
              400,
              {

                success:false,

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


        /* =====================================
           FAVICON
        ===================================== */

        if(
          pathname ===
          "/favicon.ico"
        ){

          const favicon =
            path.join(
              __dirname,
              "favicon.ico"
            );


          if(
            fs.existsSync(
              favicon
            )
          ){

            fs.readFile(
              favicon,
              (
                error,
                data
              ) => {

                if(error){

                  res.writeHead(
                    404
                  );

                  res.end();

                  return;

                }


                res.writeHead(
                  200,
                  {
                    "Content-Type":
                      "image/x-icon"
                  }
                );

                res.end(
                  data
                );

              }
            );

          }else{

            res.writeHead(
              204
            );

            res.end();

          }

          return;

        }


        /* =====================================
           STATIC FILE
        ===================================== */

        serveFile(
          req,
          res
        );

      }catch(error){

        console.error(
          "SERVER ERROR:",
          error
        );


        sendJSON(
          res,
          500,
          {

            success:false,

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


/* =========================================
   SERVER START
========================================= */

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
      "Port:",
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


/* =========================================
   ERROR HANDLING
========================================= */

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