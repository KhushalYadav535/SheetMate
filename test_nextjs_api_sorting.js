const fs = require('fs');

async function test() {
  const filePath = "C:\\Users\\Ayush Karan\\Downloads\\WhatsApp Image 2026-06-11 at 03.10.00.jpeg";
  if (!fs.existsSync(filePath)) {
    console.error("JPEG not found at:", filePath);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  const formData = new FormData();
  const fileBlob = new Blob([buffer], { type: 'image/jpeg' });
  formData.append('file', fileBlob, 'WhatsApp Image 2026-06-11 at 03.10.00.jpeg');

  try {
    console.log("Sending Sorting Materials request to Next.js API route...");
    const res = await fetch('http://127.0.0.1:3000/api/worksheets/ea6dcaf2-7751-43ec-9c59-f72b8d18a44f/review', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error("Next.js API returned error:", res.status, text);
      return;
    }
    
    const result = await res.json();
    console.log("=== NEXT.JS API RESPONSE FOR SORTING ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
