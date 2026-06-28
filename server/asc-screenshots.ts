import type { Express } from "express";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SET_ID = "b337f126-2bc2-48eb-ad78-2428623ee2c6";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "public", "asc-screenshots");

export function registerAscScreenshotRoutes(app: Express): void {
  app.use("/asc-screenshots", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });
  app.use("/asc-screenshots", express.static(SCREENSHOT_DIR));

  app.get("/api/asc-screenshots/manifest", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const files = fs
      .readdirSync(SCREENSHOT_DIR)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((fileName) => {
        const buf = fs.readFileSync(path.join(SCREENSHOT_DIR, fileName));
        return {
          fileName,
          fileSize: buf.length,
          md5: crypto.createHash("md5").update(buf).digest("hex"),
          url: `/asc-screenshots/${fileName}`,
        };
      });
    res.json({ setId: SET_ID, files });
  });
}
