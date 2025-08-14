import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter, Gauge } from 'k6/metrics';

// ===== Configurable variables =====
const URL = 'wss://sharesphere-j1xq.onrender.com/socket.io/?EIO=4&transport=websocket';
const CHUNK_SIZE_BYTES = 128 * 1024; // 128 KB
const SEND_GAP_SECONDS = 0.05;       // ~20 chunks/sec

const PRE_SEND_IDLE_MIN = 2;
const PRE_SEND_IDLE_MAX = 5;
const POST_SEND_IDLE_MIN = 5;
const POST_SEND_IDLE_MAX = 10;

const START_SIZE_MB = 100;  // start file size
const END_SIZE_MB = 300;    // end file size

// ===== Metrics =====
const wsConnectTime = new Trend('ws_connect_time_ms', true);
const bytesSent = new Counter('bytes_sent_total');
const chunksSent = new Counter('chunks_sent_total');
const sessionsFailed = new Counter('sessions_failed_total');
const sessionsOk = new Counter('sessions_ok_total');
const activeSessions = new Gauge('active_sessions');

export const options = {
  scenarios: {
    sustained_load_file_growth: {
      executor: 'ramping-vus',
      startVUs: 200,
      stages: [
        { duration: '2m', target: 300 }, // ramp up to 300 VUs
        { duration: '3m', target: 300 }, // hold
        { duration: '30s', target: 0 },  // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
};

// Gradually grow file size based on elapsed test time
function getChunksForCurrentTime(elapsedSec, totalDurationSec) {
  const progress = Math.min(elapsedSec / totalDurationSec, 1);
  const fileSizeMB = START_SIZE_MB + (END_SIZE_MB - START_SIZE_MB) * progress;
  return Math.round((fileSizeMB * 1024 * 1024) / CHUNK_SIZE_BYTES);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function () {
  const username = `user-${Math.floor(Math.random() * 1e7)}`;
  const testElapsedSec = (__ITER * (__VU / 1000)); // approximation
  const totalDurationSec = (2 * 60) + (3 * 60) + 30; // total stages in seconds
  const chunksPerUser = getChunksForCurrentTime(testElapsedSec, totalDurationSec);

  const res = ws.connect(URL, {}, function (socket) {
    const t0 = Date.now();
    let success = false;

    socket.on('open', () => {
      wsConnectTime.add(Date.now() - t0);
      activeSessions.add(1);

      sleep(randInt(PRE_SEND_IDLE_MIN, PRE_SEND_IDLE_MAX));

      const payload = 'x'.repeat(CHUNK_SIZE_BYTES);

      for (let c = 0; c < chunksPerUser; c++) {
        socket.send(
          `42["file-chunk",{"fileId":"${username}-file-1","chunkIndex":${c},"totalChunks":${chunksPerUser},"size":${CHUNK_SIZE_BYTES},"data":"${payload}"}]`
        );
        chunksSent.add(1);
        bytesSent.add(CHUNK_SIZE_BYTES);
        sleep(SEND_GAP_SECONDS);
      }

      success = true;
      sessionsOk.add(1); // Count as success after all chunks sent

      sleep(randInt(POST_SEND_IDLE_MIN, POST_SEND_IDLE_MAX));
      socket.close();
    });

    socket.on('error', () => {
      sessionsFailed.add(1);
      socket.close();
    });

    socket.on('close', () => {
      activeSessions.add(-1);
    });
  });

  check(res, { 'status is 101 (WS upgrade)': (r) => r && r.status === 101 });
}

export function handleSummary(data) {
  const totalBytes = data.metrics.bytes_sent_total.values.count;
  const testDurationSec = data.state.testRunDurationMs / 1000;
  const throughputBytesPerSec = totalBytes / testDurationSec;

  const totalGB = totalBytes / 1e9;   // Decimal GB
  const totalGiB = totalBytes / (1024 ** 3); // Binary GiB
  const throughputGBps = throughputBytesPerSec / 1e9;
  const throughputGiBps = throughputBytesPerSec / (1024 ** 3);

  return {
    stdout: `
========= Load Test Summary =========
✅ Successful Sessions : ${data.metrics.sessions_ok_total?.values.count || 0}
❌ Failed Sessions     : ${data.metrics.sessions_failed_total?.values.count || 0}
📦 Total Data Sent     : ${totalGB.toFixed(2)} GB (${totalGiB.toFixed(2)} GiB)
🚀 Average Throughput  : ${throughputGBps.toFixed(2)} GB/s (${throughputGiBps.toFixed(2)} GiB/s)
📈 Chunks Sent         : ${data.metrics.chunks_sent_total?.values.count || 0}
=====================================
`
  };
}
