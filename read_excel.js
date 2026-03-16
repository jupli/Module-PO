const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const possiblePaths = [
    'D:\\testcase.xls',
    'D:\\testcase.xlsx',
    'D:\\ testcase.xls', // Handle possible space
    'D:\\modulPO\\testcase.xls',
    'D:\\modulPO\\testcase.xlsx'
];

let filePath = '';
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        filePath = p;
        break;
    }
}

if (!filePath) {
    console.error('File not found in D:\\ or D:\\modulPO');
    process.exit(1);
}

console.log(`Reading file: ${filePath}`);

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

    console.log(`Sheet Name: ${sheetName}`);
    console.log('First 10 rows:');
    console.log(JSON.stringify(data.slice(0, 10), null, 2));

    // Try to detect headers and data structure
    if (data.length > 0) {
        const headers = data[0];
        console.log('Headers:', headers);
    }
} catch (error) {
    console.error('Error reading file:', error);
}
