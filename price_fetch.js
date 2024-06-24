const fs = require('fs');
const csv = require('csv-parser');

const inputFilePath = 'prices/gho.csv';
const outputFilePath = 'price_gho_usde.csv';

const numeratorToken = 'Gho Token';
const denominatorToken = 'USDe';

let transactions = [];

// Read the CSV file
fs.createReadStream(inputFilePath)
  .pipe(csv())
  .on('data', (row) => {
    transactions.push(row);
  })
  .on('end', () => {
    let swapEvents = [];

    // Iterate through pairs of consecutive transactions
    for (let i = 0; i < transactions.length - 1; i++) {
      let transaction1 = transactions[i];
      let transaction2 = transactions[i + 1];

      // Check if the pair meets the swap criteria
      if (transaction1['Highlight Target'] === transaction2['Highlight Target'] &&
          transaction1['Public Tag'] === transaction2['Public Tag'] &&
          transaction1['Age'] === transaction2['Age'] &&
          transaction1['Additional Value'] === transaction2['Additional Value'] &&
          transaction1['Token Name'] !== transaction2['Token Name'] &&
          transaction1['Transaction Type'] !== transaction2['Transaction Type']) {
        
        // Determine which transaction to use as numerator and denominator
        let ratio;
        if (transaction1['Token Name'] === numeratorToken && transaction2['Token Name'] === denominatorToken) {
          ratio = parseFloat(transaction1['Value']) / parseFloat(transaction2['Value']);
        } else if (transaction2['Token Name'] === numeratorToken && transaction1['Token Name'] === denominatorToken) {
          ratio = parseFloat(transaction2['Value']) / parseFloat(transaction1['Value']);
        } else {
          // Skip if the pair doesn't match the specified tokens
          continue;
        }

        // Append the swap event to the list
        swapEvents.push({ Age: transaction1['Age'], ValueRatio: ratio });
      }
    }

    // Write the swap events to a new CSV file
    const csvWriter = require('csv-writer').createObjectCsvWriter({
      path: outputFilePath,
      header: [
        { id: 'Age', title: 'Age' },
        { id: 'ValueRatio', title: 'Value Ratio' }
      ]
    });

    csvWriter.writeRecords(swapEvents)
      .then(() => {
        console.log('Swap events detection complete and saved to swap_events.csv');
      });
  });
