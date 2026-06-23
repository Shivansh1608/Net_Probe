const dns = require('dns');
const { performance } = require('perf_hooks');

/**
 * Measures the time taken to resolve a domain name.
 * @param {string} domain - Domain name to resolve (default "google.com")
 * @returns {Promise<number>} - Resolution time in milliseconds
 */
async function measureDNSTime(domain = 'google.com') {
  const start = performance.now();
  return new Promise((resolve) => {
    // We resolve the domain name
    dns.resolve(domain, 'A', (err, addresses) => {
      const end = performance.now();
      const elapsed = end - start;
      
      if (err) {
        // If lookup fails, try resolving another reliable domain as a backup
        dns.resolve('cloudflare.com', 'A', (err2) => {
          const end2 = performance.now();
          if (err2) {
            // DNS resolution completely failed (network is down or DNS misconfigured)
            resolve(999); 
          } else {
            resolve(Math.round(end2 - start));
          }
        });
      } else {
        resolve(Math.round(elapsed));
      }
    });
  });
}

module.exports = { measureDNSTime };
