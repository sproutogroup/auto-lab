/**
 * Test VAPID configuration and generate real subscription test
 */

// Test VAPID keys are loaded
console.log("=== VAPID Configuration Test ===");
console.log("VAPID_PUBLIC_KEY:", process.env.VAPID_PUBLIC_KEY ? "SET" : "NOT SET");
console.log("VAPID_PRIVATE_KEY:", process.env.VAPID_PRIVATE_KEY ? "SET" : "NOT SET");
console.log("VAPID_SUBJECT:", process.env.VAPID_SUBJECT ? "SET" : "NOT SET");

if (process.env.VAPID_PUBLIC_KEY) {
 console.log("Public key length:", process.env.VAPID_PUBLIC_KEY.length);
 console.log("Public key starts with:", process.env.VAPID_PUBLIC_KEY.substring(0, 10));
}

if (process.env.VAPID_PRIVATE_KEY) {
 console.log("Private key length:", process.env.VAPID_PRIVATE_KEY.length);
}

console.log("\n=== Client-Side Test Script ===");
console.log("Run this in the browser console to get real subscription:");
console.log(`
navigator.serviceWorker.ready.then(registration => {
  const vapidPublicKey = 'BAo_FnrKbB2p6gzRN8xTF65HGV94Xu-TSYf2VfaaISf9_Gn5j91I5X8v_1pb48aRFwV_dZrvUdVSWKRMDDVKHu8';
  
  // Convert VAPID key to Uint8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });
}).then(subscription => {
  console.log('=== REAL BROWSER SUBSCRIPTION ===');
  console.log(JSON.stringify(subscription, null, 2));
  
  // Test subscription with our API
  return fetch('/api/subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: 1,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      device_type: 'Browser',
      user_agent: navigator.userAgent
    })
  });
}).then(response => response.json()).then(result => {
  console.log('=== SUBSCRIPTION RESULT ===');
  console.log(result);
}).catch(error => {
  console.error('Subscription error:', error);
});
`);
