const fs = require('fs');

async function test() {
  const filePath = "C:\\Users\\Ayush Karan\\Downloads\\WhatsApp Image 2026-06-11 at 03.05.30.jpeg";
  if (!fs.existsSync(filePath)) {
    console.error("JPEG not found at:", filePath);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  const formData = new FormData();
  const fileBlob = new Blob([buffer], { type: 'image/jpeg' });
  formData.append('file', fileBlob, 'WhatsApp Image 2026-06-11 at 03.05.30.jpeg');

  try {
    console.log("Sending JPEG request to Next.js API route...");
    const res = await fetch('http://127.0.0.1:3000/api/worksheets/f5e113a9-980e-41b5-aae4-809446dc7822/review', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error("Next.js API returned error:", res.status, text);
      return;
    }
    
    const result = await res.json();
    console.log("=== NEXT.JS API RESPONSE FOR JPEG ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
