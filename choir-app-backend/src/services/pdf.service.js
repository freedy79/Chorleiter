const { isoDateString } = require('../utils/date.utils');

function escape(text) {
  return text.replace(/[\\()]/g, c => '\\' + c);
}

function textWidth(text, size) {
  return text.length * size * 0.6;
}

function wrapText(text, size, width) {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (textWidth(candidate, size) <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (textWidth(word, size) <= width) {
        current = word;
      } else {
        let part = '';
        for (const ch of word) {
          if (textWidth(part + ch, size) <= width) {
            part += ch;
          } else {
            if (part) lines.push(part);
            part = ch;
          }
        }
        current = part;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function monthlyPlanPdf(plan) {
  const left = 50;
  const right = 545;
  const col2 = left + 100;
  const col3 = left + 250;
  const col4 = left + 400;
  const lines = [];
  let y = 800;

  function cellCenter(x1, x2, text, yPos, size = 12) {
    const width = x2 - x1;
    const x = x1 + (width - textWidth(text, size)) / 2;
    return `BT /F1 ${size} Tf ${x} ${yPos - 2} Td (${escape(text)}) Tj ET`;
  }

  // Title
  lines.push(`BT /F1 18 Tf ${left} ${y} Td (${escape('Musikplan ' + plan.month + '/' + plan.year)}) Tj ET`);
  y -= 20;

  // Choir name sub heading
  if (plan.choir && plan.choir.name) {
    lines.push(`BT /F1 14 Tf ${left} ${y} Td (${escape(plan.choir.name)}) Tj ET`);
    y -= 20;
  } else {
    y -= 10;
  }

  // Table header
  const topLine = y + 8;
  const headerBottom = y - 12;
  lines.push('0.9 g');
  lines.push(`${left} ${headerBottom} ${right - left} 20 re f`);
  lines.push('0 g');
  lines.push('0.5 w 0 0 0 RG');
  lines.push(`${left} ${topLine} m ${right} ${topLine} l S`);
  lines.push(cellCenter(left, col2, 'Datum', y));
  lines.push(cellCenter(col2, col3, 'Chorleiter', y));
  lines.push(cellCenter(col3, col4, 'Organist', y));
  lines.push(cellCenter(col4, right, 'Notizen', y));
  y -= 20;
  lines.push(`${left} ${y + 8} m ${right} ${y + 8} l S`);

  // Table rows with wrapping
  const colWidths = [
    col2 - left,
    col3 - col2,
    col4 - col3,
    right - col4
  ];

  for (const e of plan.entries) {
    const cells = [
      wrapText(isoDateString(new Date(e.date)), 12, colWidths[0]),
      wrapText(e.director?.name || '', 12, colWidths[1]),
      wrapText(e.organist?.name || '', 12, colWidths[2]),
      wrapText(e.notes || '', 12, colWidths[3])
    ];
    const count = Math.max(...cells.map(c => c.length));
    for (let i = 0; i < count; i++) {
      lines.push(cellCenter(left, col2, cells[0][i] || '', y));
      lines.push(cellCenter(col2, col3, cells[1][i] || '', y));
      lines.push(cellCenter(col3, col4, cells[2][i] || '', y));
      lines.push(cellCenter(col4, right, cells[3][i] || '', y));
      y -= 20;
    }
    lines.push(`${left} ${y + 8} m ${right} ${y + 8} l S`);
  }

  const bottomLine = y + 8;
  // Vertical lines
  lines.push(`${left} ${topLine} m ${left} ${bottomLine} l S`);
  lines.push(`${col2} ${topLine} m ${col2} ${bottomLine} l S`);
  lines.push(`${col3} ${topLine} m ${col3} ${bottomLine} l S`);
  lines.push(`${col4} ${topLine} m ${col4} ${bottomLine} l S`);
  lines.push(`${right} ${topLine} m ${right} ${bottomLine} l S`);
  const content = lines.join('\n');
  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>'); //1
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'); //2
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>'); //3
  objects.push('<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); //4
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`); //5
  const offsets = [];
  let pdf = '%PDF-1.4\n';
  for (let i = 0; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i+1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

module.exports = { monthlyPlanPdf };
