// Generate a proper 65-byte p256dh key for testing
import crypto from "crypto";

// Generate a 65-byte p256dh key (starts with 0x04 for uncompressed format)
const key = Buffer.alloc(65);
key[0] = 0x04; // Uncompressed format marker
crypto.randomFillSync(key, 1); // Fill remaining 64 bytes with random data

const p256dhKey = key.toString("base64");
console.log("Generated p256dh key (65 bytes):", p256dhKey);
console.log("Key length:", Buffer.from(p256dhKey, "base64").length);

// Generate a 16-byte auth key
const authKey = crypto.randomBytes(16).toString("base64");
console.log("Generated auth key (16 bytes):", authKey);
console.log("Auth key length:", Buffer.from(authKey, "base64").length);

console.log("\nTest subscription object:");
console.log(
 JSON.stringify(
  {
   user_id: 1,
   endpoint: "https://fcm.googleapis.com/fcm/send/test-phase3-real-key",
   keys: {
    p256dh: p256dhKey,
    auth: authKey,
   },
   device_type: "iOS",
   user_agent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  },
  null,
  2,
 ),
);
