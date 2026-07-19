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
  formData.append('worksheetId', 'ea6dcaf2-7751-43ec-9c59-f72b8d18a44f');

  try {
    const res = await fetch('http://127.0.0.1:8000/grade-document', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();
    console.log("=== RAW MICROSERVICE OCR RESULT ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
