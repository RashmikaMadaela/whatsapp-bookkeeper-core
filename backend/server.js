import express from "express";
import dotenv from "dotenv";
import { handleIncoming } from "./handlers/messageHandler.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
