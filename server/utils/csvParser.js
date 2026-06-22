/**
 * Simple, robust CSV parser for bulk operations
 */
export function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCSVRow(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i]);
    if (values.length === 0) continue;
    const record = {};
    headers.forEach((header, idx) => {
      // Normalize header key: e.g. "Full Name" -> "fullname" or "Display Name" -> "displayname"
      const cleanHeader = header
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, '');
      record[cleanHeader] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    records.push(record);
  }

  return records;
}

function parseCSVRow(rowText) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  // Clean quotes from parsed values
  return result.map((val) => val.replace(/^"|"$/g, '').trim());
}

/**
 * Generate CSV string from records
 */
export function generateCSV(records, fields) {
  if (!records || records.length === 0) return '';
  const selectedFields = fields || Object.keys(records[0]);

  const headerRow = selectedFields.join(',');
  const dataRows = records.map((record) => {
    return selectedFields
      .map((field) => {
        let val = record[field];
        if (val === undefined || val === null) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        } else {
          val = String(val);
        }
        // Escape quotes and wrap in quotes if contains commas or quotes
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}
