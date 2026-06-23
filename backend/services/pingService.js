const ping = require('ping');
const net = require('net');
const { performance } = require('perf_hooks');

/**
 * Measures latency using a TCP socket handshake to a given host and port.
 * @param {string} host 
 * @param {number} port 
 * @param {number} timeout 
 * @returns {Promise<{alive: boolean, time: number}>}
 */
function tcpPing(host, port = 80, timeout = 2000) {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.connect(port, host, () => {
      const elapsed = performance.now() - start;
      socket.destroy();
      resolve({ alive: true, time: elapsed });
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve({ alive: false, time: 0 });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ alive: false, time: 0 });
    });
  });
}

/**
 * Pings a target host multiple times to measure average latency and packet loss.
 * Falls back to a TCP handshake if ICMP is blocked in the host environment.
 * @param {string} host - The target hostname or IP address (e.g., "8.8.8.8")
 * @param {number} count - Number of ping attempts (default 4)
 * @returns {Promise<{host: string, latency: number, packetLoss: number}>}
 */
async function pingHost(host, count = 4) {
  let sent = 0;
  let received = 0;
  let totalLatency = 0;

  for (let i = 0; i < count; i++) {
    sent++;
    try {
      // Probe with a timeout of 2 seconds
      const res = await ping.promise.probe(host, { timeout: 2 });
      if (res.alive) {
        received++;
        const time = parseFloat(res.time);
        if (!isNaN(time)) {
          totalLatency += time;
        }
      }
    } catch (err) {
      console.error(`Ping attempt ${i + 1} to ${host} failed:`, err.message);
    }
  }

  let packetLoss = sent > 0 ? ((sent - received) / sent) * 100 : 100;
  let avgLatency = received > 0 ? totalLatency / received : 0;

  // FALLBACK: If ICMP returns 100% packet loss (due to local firewall / ISP blocking ICMP),
  // try measuring TCP socket connection latency to verify if the internet is actually online.
  if (packetLoss === 100) {
    // If target host is 8.8.8.8 / 1.1.1.1, port 53 is DNS and often filtered, so use google.com port 80 as a fallback
    const targetHost = (host === '8.8.8.8' || host === '1.1.1.1') ? 'google.com' : host;
    const port = 80;
    
    let tcpSuccessCount = 0;
    let tcpTotalLatency = 0;

    for (let i = 0; i < count; i++) {
      const tcpRes = await tcpPing(targetHost, port, 2000);
      if (tcpRes.alive) {
        tcpSuccessCount++;
        tcpTotalLatency += tcpRes.time;
      }
    }

    if (tcpSuccessCount > 0) {
      // TCP fallback succeeded. Override packet loss and average latency.
      packetLoss = ((count - tcpSuccessCount) / count) * 100;
      avgLatency = tcpTotalLatency / tcpSuccessCount;
    }
  }

  return {
    host,
    latency: Math.round(avgLatency * 10) / 10, // 1 decimal place
    packetLoss: Math.round(packetLoss * 10) / 10
  };
}

module.exports = { pingHost };

