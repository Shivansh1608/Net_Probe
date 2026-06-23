const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Generates an HTML string representing the network performance report.
 * @param {object} data - Report data containing stats, diagnosis log, and metadata
 * @returns {string} - Styled HTML page
 */
function getReportTemplate(data) {
  const { periodStart, periodEnd, avgHealthScore, metricsCount, stats, diagnoses, aiSummary } = data;

  const formattedStart = new Date(periodStart).toLocaleString();
  const formattedEnd = new Date(periodEnd).toLocaleString();
  const formattedGen = new Date().toLocaleString();

  const diagnosisRows = diagnoses.length === 0
    ? `<tr><td colspan="4" style="text-align: center; color: #888;">No critical issues detected during this period.</td></tr>`
    : diagnoses.map(d => `
        <tr>
          <td><span class="severity severity-${d.severity}">${d.severity.toUpperCase()}</span></td>
          <td><strong>${d.issueType}</strong></td>
          <td>${d.explanation}</td>
          <td>${new Date(d.timestamp).toLocaleString()}</td>
        </tr>
      `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Network Performance Audit Report</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          margin: 0;
          padding: 30px;
          background-color: #fff;
        }
        .header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #1e3a8a;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          background-color: #f9fafb;
        }
        .card h2 {
          margin-top: 0;
          font-size: 16px;
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
        }
        .score-box {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 15px;
        }
        .score-value {
          font-size: 48px;
          font-weight: bold;
          color: #2563eb;
        }
        .score-label {
          font-size: 14px;
          color: #4b5563;
        }
        .stats-table, .issue-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .stats-table th, .stats-table td, .issue-table th, .issue-table td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          text-align: left;
          font-size: 13px;
        }
        .stats-table th, .issue-table th {
          background-color: #f3f4f6;
          color: #374151;
        }
        .severity {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .severity-low { background-color: #d1fae5; color: #065f46; }
        .severity-medium { background-color: #fef3c7; color: #92400e; }
        .severity-high { background-color: #fee2e2; color: #991b1b; }
        .ai-box {
          border-left: 4px solid #10b981;
          background-color: #ecfdf5;
          padding: 15px;
          border-radius: 4px;
          font-style: italic;
          font-size: 14px;
          margin-top: 10px;
          line-height: 1.5;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Smart Network Performance Audit</h1>
        <p>Reporting Period: ${formattedStart} to ${formattedEnd}</p>
        <p>Report Generated On: ${formattedGen} | Samples Scanned: ${metricsCount}</p>
      </div>

      <div class="summary-grid">
        <div class="card">
          <h2>Network Health Summary</h2>
          <div class="score-box">
            <div class="score-value">${Math.round(avgHealthScore)}%</div>
            <div class="score-label">
              <strong>Average Health Score</strong><br/>
              Based on latency, packet loss, DNS, and signal strength thresholds.
            </div>
          </div>
        </div>

        <div class="card">
          <h2>AI Diagnostic Assistant Summary</h2>
          <div class="ai-box">
            ${aiSummary || 'AI analysis is disabled or unavailable for this report.'}
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 30px;">
        <h2>Performance Metrics Analysis</h2>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Average</th>
              <th>Min</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Latency (ms)</td>
              <td>${stats.latency.avg.toFixed(1)}</td>
              <td>${stats.latency.min.toFixed(1)}</td>
              <td>${stats.latency.max.toFixed(1)}</td>
            </tr>
            <tr>
              <td>Packet Loss (%)</td>
              <td>${stats.packetLoss.avg.toFixed(1)}</td>
              <td>${stats.packetLoss.min.toFixed(1)}</td>
              <td>${stats.packetLoss.max.toFixed(1)}</td>
            </tr>
            <tr>
              <td>DNS Lookup (ms)</td>
              <td>${stats.dnsTime.avg.toFixed(1)}</td>
              <td>${stats.dnsTime.min.toFixed(1)}</td>
              <td>${stats.dnsTime.max.toFixed(1)}</td>
            </tr>
            <tr>
              <td>Download Speed (Mbps)</td>
              <td>${stats.downloadSpeed.avg.toFixed(1)}</td>
              <td>${stats.downloadSpeed.min.toFixed(1)}</td>
              <td>${stats.downloadSpeed.max.toFixed(1)}</td>
            </tr>
            <tr>
              <td>Upload Speed (Mbps)</td>
              <td>${stats.uploadSpeed.avg.toFixed(1)}</td>
              <td>${stats.uploadSpeed.min.toFixed(1)}</td>
              <td>${stats.uploadSpeed.max.toFixed(1)}</td>
            </tr>
            <tr>
              <td>Wi-Fi Signal Strength (%)</td>
              <td>${stats.wifiSignal.avg.toFixed(1)}</td>
              <td>${stats.wifiSignal.min.toFixed(1)}</td>
              <td>${stats.wifiSignal.max.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>Logged Diagnostic Events</h2>
        <table class="issue-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Issue Type</th>
              <th>Detailed Explanation / Recommendation</th>
              <th>Occurred At</th>
            </tr>
          </thead>
          <tbody>
            ${diagnosisRows}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>Smart Network Performance Analyzer + AI Diagnostic Assistant &copy; 2026. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Renders report data to a PDF file. If Puppeteer is unavailable,
 * falls back to saving a beautifully formatted static HTML report.
 * @param {object} reportData - Object matching template parameters
 * @param {string} outputPath - Target absolute file path to output
 * @returns {Promise<string>} - The path of the generated file
 */
async function generatePDFReport(reportData, outputPath) {
  // Ensure storage folder exists
  const folder = path.dirname(outputPath);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const htmlContent = getReportTemplate(reportData);

  try {
    console.log('Launching Puppeteer to generate PDF...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm'
      }
    });

    await browser.close();
    console.log(`PDF report successfully created at: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.warn('Puppeteer PDF generation failed. Creating a high-fidelity HTML report fallback instead:', err.message);
    
    // Replace extension with .html to match the fallback content
    const htmlOutputPath = outputPath.replace(/\.pdf$/i, '.html');
    fs.writeFileSync(htmlOutputPath, htmlContent, 'utf8');
    
    console.log(`Fallback HTML report successfully created at: ${htmlOutputPath}`);
    return htmlOutputPath;
  }
}

module.exports = { generatePDFReport };
