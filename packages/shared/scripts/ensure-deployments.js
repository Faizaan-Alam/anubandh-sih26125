const fs = require("node:fs");
const path = require("node:path");
const dir = path.join(__dirname, "..", "deployments");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const keep = path.join(dir, ".gitkeep");
if (!fs.existsSync(keep)) fs.writeFileSync(keep, "");
