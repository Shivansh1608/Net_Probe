const { exec } = require('child_process');
const os = require('os');

/**
 * Executes a shell command and returns the stdout.
 * @param {string} cmd 
 * @returns {Promise<string>}
 */
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve(''); // Resolve with empty string on failure instead of crashing
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Retrieves the current Wi-Fi signal strength (0-100%).
 * If running on a system without Wi-Fi or command execution fails,
 * it returns a fallback value (e.g., 100 for wired/unknown, or pulls from manual override).
 * @param {number} manualOverrideValue - Value to use if hardware info cannot be read
 * @returns {Promise<number>} - Wi-Fi signal strength percentage (0-100)
 */
async function getWifiSignal(manualOverrideValue = 85) {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      // Windows: parse netsh output
      const stdout = await runCommand('netsh wlan show interfaces');
      if (!stdout) return manualOverrideValue;

      // Look for "Signal             : 90%"
      const match = stdout.match(/Signal\s*:\s*(\d+)%/i);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      
      // If we see "State : disconnected" or similar and no signal line, it might be disconnected
      if (stdout.includes('disconnected')) {
        return 0;
      }
    } else if (platform === 'linux') {
      // Linux: try nmcli first
      let stdout = await runCommand("nmcli -t -f active,signal dev wifi");
      if (stdout) {
        // Output format: yes:90\nno:40\n...
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.startsWith('yes:')) {
            const parts = line.split(':');
            if (parts[1]) {
              return parseInt(parts[1], 10);
            }
          }
        }
      }

      // Try iwconfig as a secondary fallback
      stdout = await runCommand('iwconfig');
      if (stdout) {
        // Look for "Link Quality=70/70" or "Signal level=-50 dBm"
        const match = stdout.match(/Link Quality=(\d+)\/(\d+)/i);
        if (match && match[1] && match[2]) {
          const numerator = parseInt(match[1], 10);
          const denominator = parseInt(match[2], 10);
          return Math.round((numerator / denominator) * 100);
        }
      }
    } else if (platform === 'darwin') {
      // macOS: parse airport utility
      const stdout = await runCommand('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I');
      if (stdout) {
        const rssiMatch = stdout.match(/agrCtlRSSI:\s*(-\d+)/i);
        const noiseMatch = stdout.match(/agrCtlNoise:\s*(-\d+)/i);
        if (rssiMatch && rssiMatch[1]) {
          const rssi = parseInt(rssiMatch[1], 10);
          const noise = noiseMatch && noiseMatch[1] ? parseInt(noiseMatch[1], 10) : -96;
          // Calculate SNR and convert to approximate percentage
          const snr = rssi - noise;
          const percentage = Math.min(Math.max(2 * (snr - 10), 0), 100);
          return percentage;
        }
      }
    }
  } catch (err) {
    console.warn('Wi-Fi hardware info check failed due to error:', err.message);
  }

  // Fallback if no Wi-Fi interface or query failed (e.g. Ethernet wired system)
  return manualOverrideValue;
}

module.exports = { getWifiSignal };
