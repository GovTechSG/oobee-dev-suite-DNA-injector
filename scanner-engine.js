// engine.js - Deep Scan Version
const { chromium } = require('playwright');
const fs = require('fs');

async function runDeepScan(url) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url);
    // CRITICAL: Wait for network to be idle so Tailwind/CSS finishes loading
    await page.waitForLoadState('networkidle');

    const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    await page.evaluate(axeSource);

    const results = await page.evaluate(async () => {
        return await axe.run({
            // Report violations AND incomplete (potential) issues
            resultTypes: ['violations', 'incomplete'],
            runOnly: ['wcag2a', 'wcag2aa', 'best-practice']
        });
    });

    // Combine both arrays
    const allFound = [
        ...results.violations.map(v => ({ ...v, status: '🔴 CRITICAL' })),
        ...results.incomplete.map(v => ({ ...v, status: '🟡 POTENTIAL' }))
    ];

    const report = [];
    for (const item of allFound) {
        for (const node of item.nodes) {
            const dna = await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                return {
                    path: el.getAttribute('data-oobee-path'),
                    line: el.getAttribute('data-oobee-line'),
                    col: el.getAttribute('data-oobee-column'),
                    html: el.outerHTML.substring(0, 80)
                };
            }, node.target[0]);

            if (dna && dna.path) {
                report.push({
                    Status: item.status,
                    Issue: item.help,
                    Description: item.description,
                    Location: `${dna.path.split('/').pop()}:${dna.line}:${dna.col}`,
                    Snippet: dna.html
                });
            }
        }
    }

    console.table(report);
    await browser.close();
}

runDeepScan('http://localhost:5173');