const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {

  let filePath;

  if (req.url === "/" || req.url === "/index.html") {
    filePath = path.join(__dirname, "index.html");
  } else {
    filePath = path.join(__dirname, req.url);
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
        "Content-Type": "text/plain; charset=utf-8"
      });

      res.end("404 - File Not Found");
      return;
    }

    let contentType = "text/html; charset=utf-8";

    if (filePath.endsWith(".json")) {
      contentType = "application/json; charset=utf-8";
    }

    if (filePath.endsWith(".css")) {
      contentType = "text/css; charset=utf-8";
    }

    if (filePath.endsWith(".js")) {
      contentType = "application/javascript; charset=utf-8";
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });

    res.end(data);

  });

});


server.listen(PORT, () => {

  console.log(
    `Live Score server started on port ${PORT}`
  );

});