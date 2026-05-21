const FormData = require('form-data');
const http = require('http');

const csv = 'Sr_no,Name,Email,Certificate_ID,Date\n1,John Doe,john@example.com,CERT-001,2024-01-01\n';

const form = new FormData();
form.append('subject', 'Test Certificate');
form.append('body', 'Dear {Name}, your certificate is {CertificateID}.');
form.append('accessToken', 'demo_token');
form.append('senderEmail', 'demo@test.com');
form.append('csvfile', Buffer.from(csv), { filename: 'recipients.csv', contentType: 'text/csv' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/mass-mail?action=send',
  method: 'POST',
  headers: form.getHeaders()
};

console.log('Sending request to /api/mass-mail?action=send ...');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
      if (res.statusCode === 200 && parsed.success) {
        console.log('\n✅ PASS — mass-mail endpoint working correctly');
      } else {
        console.log('\n❌ FAIL — unexpected response');
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

form.pipe(req);
