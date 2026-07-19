async function testExtract() {
  try {
    const res = await fetch('http://localhost:3000/api/chat/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Class 8 Maths on trignometry' }
        ],
        profile: null
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

testExtract();
