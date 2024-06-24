const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: false }); // Set headless to false for debugging
        const csvPath = path.resolve(__dirname, 'transactions.csv');

        const csvWriter = createCsvWriter({
            path: csvPath,
            header: [
                { id: 'block', title: 'Block' },
                { id: 'value', title: 'Value' },
                { id: 'tokenName', title: 'Token Name' },
                { id: 'additionalValue', title: 'Additional Value' },
                { id: 'highlightTarget', title: 'Highlight Target' },
                { id: 'publicTag', title: 'Public Tag' },
                { id: 'age', title: 'Age' },
                { id: 'transactionType', title: 'Transaction Type' } // New column for IN/OUT element
            ],
            append: fs.existsSync(csvPath) // Append if the file already exists
        });

        for (let i = 2; i <= 3; i++) { // Replace X and Y with your range
            console.log(`Navigating to page ${i}...`);
            const page = await browser.newPage();
            const url = `https://etherscan.io/tokentxns?a=0x670a72e6d22b0956c0d2573288f82dcc5d6e3a61&p=${i}`;
            await page.goto(url, { waitUntil: 'networkidle2' });

            // Wait for the specific element that indicates the page is fully loaded
            await page.waitForSelector('table.table tbody tr', { timeout: 30000 });

            console.log(`Page ${i} loaded.`);

            // Scrape data
            const data = await page.evaluate(() => {
                const rows = document.querySelectorAll('tr');
                const transactions = [];

                rows.forEach(row => {
                    const block = row.querySelector('a[href*="/block/"]')?.innerText;

                    // Get all instances of the <td> with the span and choose the one without the 'rel' attribute
                    const valueElements = Array.from(row.querySelectorAll('td span[data-bs-title]'))
                        .filter(span => !span.hasAttribute('rel'));
                    const value = valueElements.length > 1 ? parseFloat(valueElements[1].getAttribute('data-bs-title').replace(/,/g, '')) : null;

                    const tokenNameElement = row.querySelector('div.d-flex.gap-1[data-bs-toggle="tooltip"] span.hash-tag');
                    const tokenName = tokenNameElement ? tokenNameElement.innerText : null;

                    // Get the additional value
                    const additionalValueElement = row.querySelector('td span[data-title]');
                    const additionalValue = additionalValueElement ? additionalValueElement.getAttribute('data-title') : null;

                    // Get the highlight target and public tag values in the order they appear
                    let highlightTarget = null;
                    let publicTag = null;
                    const highlightTargetElement = row.querySelector('span[data-highlight-target]');
                    if (highlightTargetElement) {
                        highlightTarget = highlightTargetElement.getAttribute('data-bs-title');
                    }
                    const publicTagElement = row.querySelector('a[data-highlight-target]');
                    if (publicTagElement) {
                        publicTag = publicTagElement.innerText;
                    }

                    // Get the age value
                    const ageElement = row.querySelector('td.showAge span[rel="tooltip"]');
                    const age = ageElement ? ageElement.getAttribute('data-bs-title') : null;

                    // Get the transaction type (IN/OUT)
                    const transactionTypeElement = row.querySelector('td span.badge.bg-warning, td span.badge.bg-success');
                    const transactionType = transactionTypeElement ? transactionTypeElement.innerText : null;

                    if (block && value !== null && tokenName && additionalValue && highlightTarget && publicTag && age && transactionType) {
                        transactions.push({
                            block: block.trim(),
                            value: value,
                            tokenName: tokenName.trim(),
                            additionalValue: additionalValue.trim(),
                            highlightTarget: highlightTarget ? highlightTarget.trim() : '',
                            publicTag: publicTag ? publicTag.trim() : '',
                            age: age.trim(),
                            transactionType: transactionType.trim()
                        });
                    }
                });

                return transactions;
            });

            console.log(`Data scraped from page ${i}:`, data);

            // Write data to CSV
            await csvWriter.writeRecords(data);
            console.log(`Data from page ${i} appended to CSV file.`);

            await page.close();
        }

        await browser.close();
        console.log('Browser closed.');

    } catch (error) {
        console.error('An error occurred:', error);
    }
})();
