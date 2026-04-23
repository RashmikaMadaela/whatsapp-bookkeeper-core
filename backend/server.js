import express from "express";
import dotenv from "dotenv";
import { createHmac, timingSafeEqual } from "crypto";
import { handleIncoming } from "./handlers/messageHandler.js";

dotenv.config();

const app = express();

// ---------------------------------------------------------------------------
// Webhook route needs raw body for HMAC verification — set it up before
// the global JSON parser.
// ---------------------------------------------------------------------------
app.use(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    // Attach parsed body so handlers can use req.body normally
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch {
        req.body = {};
      }
    }
    next();
  }
);

// All other routes use JSON parser
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Signature verification helper
// ---------------------------------------------------------------------------
function verifySignature(req) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true; // Skip if not configured (dev mode)

  const sigHeader = req.headers["x-hub-signature-256"];
  if (!sigHeader) return false;

  const expected = "sha256=" + createHmac("sha256", appSecret)
    .update(req.rawBody ?? Buffer.alloc(0))
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GET /webhook  — Meta webhook verification
// ---------------------------------------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---------------------------------------------------------------------------
// POST /webhook  — Incoming WhatsApp messages
// Return 200 immediately; process asynchronously to avoid duplicate retries.
// ---------------------------------------------------------------------------
app.post("/webhook", (req, res) => {
  if (!verifySignature(req)) {
    console.warn("⚠️  Rejected webhook: invalid signature");
    return res.sendStatus(403);
  }

  res.sendStatus(200); // acknowledge immediately

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) return; // status update / read receipt, ignore

    const senderId = message.from;
    const messageType = message.type; // "text" | "image"
    const caption = message.image?.caption?.trim().toLowerCase() ?? "";
    const textBody = message.text?.body?.trim() ?? "";
    const mediaId = message.image?.id ?? null;

    handleIncoming({ senderId, messageType, caption, textBody, mediaId }).catch(
      (err) => console.error("❌ handleIncoming error:", err)
    );
  } catch (err) {
    console.error("❌ Webhook parse error:", err);
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
