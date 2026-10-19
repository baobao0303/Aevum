/**
 * RFC 4180 Compliant CSV & TSV Parser & Serializer for Flashcard Import/Export
 * Supports quotes, multi-line definitions, comma/tab delimiters
 */

export interface ParsedCardItem {
  term: string;
  definition: string;
}

export function detectDelimiter(text: string): '\t' | ',' {
  const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount >= commaCount ? '\t' : ',';
}

export function parseCsvCards(
  rawText: string,
  forcedDelimiter?: '\t' | ','
): ParsedCardItem[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const delimiter = forcedDelimiter || detectDelimiter(rawText);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < rawText.length) {
    const char = rawText[i];
    const nextChar = rawText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === delimiter) {
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    if (char === '\r' || char === '\n') {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  // Push last field and row if any
  if (currentField.length > 0 || inQuotes) {
    currentRow.push(currentField.trim());
  }
  if (currentRow.some(field => field.length > 0)) {
    rows.push(currentRow);
  }

  return rows
    .map(row => ({
      term: row[0] || '',
      definition: row.slice(1).join(' - ') || '',
    }))
    .filter(item => item.term.length > 0 || item.definition.length > 0);
}

export function serializeCardsToCsv(
  cards: Array<{ term: string; definition: string }>,
  delimiter: '\t' | ',' = '\t'
): string {
  const escapeField = (val: string): string => {
    if (
      val.includes('"') ||
      val.includes(delimiter) ||
      val.includes('\n') ||
      val.includes('\r')
    ) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  return cards
    .map(
      card =>
        `${escapeField(card.term)}${delimiter}${escapeField(card.definition)}`
    )
    .join('\n');
}
