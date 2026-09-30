const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

const API_BASE =
  "https://sportscore.com/api/widget/matches/";


// ========================================
// GET LIVE SPORTS DATA
// ========================================

async function getMatches(sport) {

  const url =
    API_BASE +
    "?sport=" +
    encodeURIComponent(sport) +
    "&limit=50";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      "Sports API error: " + response.status
    );
  }

  return await response.json();
}


// ========================================
// SERVER
// ========================================

const server = http.createServer(async (req, res) => {

  // -------------------------------
  // FOOTBALL API
  // -------------------------------

  if (req.url.startsWith("/api/football")) {

    try {

      const data =
        await getMatches("football");

      res.writeHead(200, {
        "Content-Type":
          "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      });

      res.end(JSON.stringify(data));

    } catch (error) {

      console.error(error);

      res.writeHead(500, {
        "Content-Type":
          "application/json; charset=utf-8"
      });

      res.end(
        JSON.stringify({
          success: false,
          error: "Football data পাওয়া যাচ্ছে না"
        })
      );
    }

    return;
  }


  // -------------------------------
  // CRICKET API
  // -------------------------------

  if (req.url.startsWith("/api/cricket")) {

    try {

      const data =
        await getMatches("cricket");

      res.writeHead(200, {
        "Content-Type":
          "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      });

      res.end(JSON.stringify(data));

    } catch (error) {

      console.error(error);

      res.writeHead(500, {
        "Content-Type":
          "application/json; charset=utf-8"
      });

      res.end(
        JSON.stringify({
          success: false,
          error: "Cricket data পাওয়া যাচ্ছে না"
        })
      );
    }

    return;
  }


  // -------------------------------
  // HEALTH CHECK
  // -------------------------------

  if (req.url === "/health") {

    res.writeHead(200, {
      "Content-Type":
        "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        status: "ok",
        app: "Live Score",
        football: true,
        cricket: true
      })
    );

    return;
  }


  // -------------------------------
  // WEBSITE FILES
  // -------------------------------

  let filePath;

  if (
    req.url === "/" ||
    req.url === "/index.html"
  ) {

    filePath =
      path.join(__dirname, "index.html");

  } else {

    filePath =
      path.join(__dirname, req.url);
  }


  // Security

  if (!filePath.startsWith(__dirname)) {

    res.writeHead(403);
    res.end("Forbidden");

    return;
  }


  fs.readFile(filePath, (err, data) => {

    if (err) {

      res.writeHead(404, {
        "Content-Type":
          "text/plain; charset=utf-8"
      });

      res.end("404 - File Not Found");

      return;
    }


    let contentType =
      "text/html; charset=utf-8";


    if (filePath.endsWith(".json")) {

      contentType =
        "application/json; charset=utf-8";

    }


    if (filePath.endsWith(".css")) {

      contentType =
        "text/css; charset=utf-8";

    }


    if (filePath.endsWith(".js")) {

      contentType =
        "application/javascript; charset=utf-8";

    }


    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });


    res.end(data);

  });

});


// ========================================
// START SERVER
// ========================================

server.listen(PORT, () => {

  console.log(
    "Live Score server started on port " +
    PORT
  );

});