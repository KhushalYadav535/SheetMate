const fs = require('fs');

async function test() {
  const filePath = "C:\\Users\\Ayush Karan\\Downloads\\WhatsApp Image 2026-06-11 at 03.05.30.pdf";
  if (!fs.existsSync(filePath)) {
    console.error("PDF not found at:", filePath);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  const formData = new FormData();
  const fileBlob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'WhatsApp Image 2026-06-11 at 03.05.30.pdf');
  formData.append('worksheetId', 'f5e113a9-980e-41b5-aae4-809446dc7822');

  try {
    const res = await fetch('http://127.0.0.1:8000/grade-document', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();
    console.log("=== OCR RESULT ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
