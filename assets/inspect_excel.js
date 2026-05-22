const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('Agent_Pricing_Calculator_v3_Final - Copy.xlsx');
  console.log("Sheet names:", workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`Total Rows: ${data.length}`);
    
    // Print first 30 rows
    const preview = data.slice(0, 30);
    preview.forEach((row, i) => {
        console.log(`Row ${i + 1}: ${JSON.stringify(row)}`);
    });
  });
} catch (error) {
  console.error("Error reading file:", error.message);
}
