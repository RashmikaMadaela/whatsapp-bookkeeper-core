import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}`;

/**
 * Send a text message to a WhatsApp number via the Meta Cloud API.
 * @param {string} to - Recipient phone number (E.164 without '+')
 * @param {string} text - Message body
 */
export async function sendMessage(to, text) {
  await axios.post(
    `${GRAPH_API_URL}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Retrieve the direct download URL for a WhatsApp media object.
 * @param {string} mediaId
 * @returns {Promise<string>} The temporary CDN URL for the media
 */
export async function getMediaUrl(mediaId) {
  const response = await axios.get(
    `https://graph.facebook.com/v20.0/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    }
  );
  return response.data.url;
}

/**
 * Download media binary data from WhatsApp CDN.
 * @param {string} url - URL returned by getMediaUrl()
 * @returns {Promise<Buffer>} Raw image buffer
 */
export async function downloadMedia(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  });
  return Buffer.from(response.data);
}
