const WebSocket = require('ws');

const tests = [
  // Valid messages
  { name: 'full message',              expect: 'pass', msg: { sensor_id: 'sensor-01', temperature: 24.5, humidity: 62.3, co2: 412.0, timestamp: 1743724800 } },
  { name: 'sensor_id as number',       expect: 'pass', msg: { sensor_id: 1, temperature: 24.5, humidity: 62.3, co2: 412.0, timestamp: 1743724800 } },
  { name: 'only required fields',      expect: 'pass', msg: { sensor_id: 'sensor-01', timestamp: 1743724800 } },
  { name: 'temp missing',             expect: 'pass', msg: { sensor_id: 'sensor-01', humidity: 62.3, timestamp: 1743724800 } },
  { name: 'humidity missing',         expect: 'pass', msg: { sensor_id: 'sensor-01', temperature: 24.5, timestamp: 1743724800 } },
  { name: 'co2 missing',              expect: 'pass', msg: { sensor_id: 'sensor-01', temperature: 24.5, humidity: 62.3, timestamp: 1743724800 } },
  { name: 'co2 null',                 expect: 'pass', msg: { sensor_id: 'sensor-01', temperature: 24.5, humidity: 62.3, co2: null, timestamp: 1743724800 } },
  { name: 'temp null',                expect: 'pass', msg: { sensor_id: 'sensor-01', temperature: null, humidity: 62.3, timestamp: 1743724800 } },
  { name: 'humidity null',            expect: 'pass', msg: { sensor_id: 'sensor-01', temperature: 24.5, humidity: null, timestamp: 1743724800 } },
  { name: 'negative temp',            expect: 'pass', msg: { sensor_id: 'sensor-01', temperature: -5.0, timestamp: 1743724800 } },
  { name: 'zero values',              expect: 'pass', msg: { sensor_id: 'sensor-01', temperature: 0, humidity: 0, co2: 0, timestamp: 0 } },
  { name: 'float timestamp',          expect: 'pass', msg: { sensor_id: 'sensor-01', timestamp: 1743724800.5 } },

  // Invalid sensor_id
  { name: 'sensor_id empty string',   expect: 'fail', msg: { sensor_id: '', temperature: 24.5, timestamp: 1743724800 } },
  { name: 'sensor_id null',           expect: 'fail', msg: { sensor_id: null, temperature: 24.5, timestamp: 1743724800 } },
  { name: 'sensor_id missing',        expect: 'fail', msg: { temperature: 24.5, timestamp: 1743724800 } },
  { name: 'sensor_id boolean',        expect: 'fail', msg: { sensor_id: true, temperature: 24.5, timestamp: 1743724800 } },

  // Invalid temperature
  { name: 'temp string',              expect: 'fail', msg: { sensor_id: 'sensor-01', temperature: '24.5', timestamp: 1743724800 } },

  // Invalid humidity
  { name: 'humidity string',          expect: 'fail', msg: { sensor_id: 'sensor-01', humidity: '62.3', timestamp: 1743724800 } },

  // Invalid co2
  { name: 'co2 string',              expect: 'fail', msg: { sensor_id: 'sensor-01', co2: '412', timestamp: 1743724800 } },

  // Invalid timestamp
  { name: 'timestamp null',          expect: 'fail', msg: { sensor_id: 'sensor-01', timestamp: null } },
  { name: 'timestamp string',        expect: 'fail', msg: { sensor_id: 'sensor-01', timestamp: '1743724800' } },
  { name: 'timestamp missing',       expect: 'fail', msg: { sensor_id: 'sensor-01', temperature: 24.5 } },

  // Malformed
  { name: 'empty object',            expect: 'fail', msg: {} },
  { name: 'raw string',              expect: 'fail', raw: 'hello' },
  { name: 'raw number',              expect: 'fail', raw: '42' },
  { name: 'empty string',            expect: 'fail', raw: '' },
  { name: 'array',                   expect: 'fail', raw: '[1,2,3]' },
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:8080');
      const timeout = setTimeout(() => { ws.close(); resolve(null); }, 1000);

      ws.on('open', () => {
        const payload = test.raw !== undefined ? test.raw : JSON.stringify(test.msg);
        ws.send(payload);
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        ws.close();
        resolve(data.toString());
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        resolve('CONNECTION ERROR: ' + err.message);
      });
    });

    const gotError = result && result.includes('"error"');
    const ok = test.expect === 'pass' ? !gotError && result === null : gotError;
    const status = ok ? 'PASS' : 'FAIL';

    if (ok) passed++; else failed++;
    console.log(`[${status}] ${test.name.padEnd(30)} -> ${result || '(broadcasted)'}`);
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${tests.length} tests`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
