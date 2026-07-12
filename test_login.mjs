

async function test() {
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@siteline.com', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  console.log('Login data:', loginData);

  const token = loginData.data.token;

  const statsRes = await fetch('http://localhost:3000/api/v1/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!statsRes.ok) {
    console.log('Stats status:', statsRes.status);
    const text = await statsRes.text();
    console.log('Stats text:', text);
  }
}

test();
