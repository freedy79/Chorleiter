const { shortWeekdayDateString, germanDateString } = require('../utils/date.utils');

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
      wrapText(shortWeekdayDateString(new Date(e.date)), 12, colWidths[0]),
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
  const standDate = germanDateString(plan.updatedAt ? new Date(plan.updatedAt) : new Date());
  lines.push(`BT /F1 12 Tf ${left} ${y - 12} Td (${escape('Stand: ' + standDate)}) Tj ET`);
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

function programPdf(program) {
  const left = 50;
  const right = 545;
  const lines = [];
  let y = 800;

  // Title
  lines.push(`BT /F1 18 Tf ${left} ${y} Td (${escape(program.title || 'Programm')}) Tj ET`);
  y -= 30;

  const width = right - left;
  const size = 12;

  // Optional description
  if (program.description) {
    const descLines = wrapText(program.description, size, width);
    for (const line of descLines) {
      const x = left + (width - textWidth(line, size)) / 2;
      lines.push(`BT /F1 ${size} Tf ${x} ${y} Td (${escape(line)}) Tj ET`);
      y -= 16;
    }
    y -= 20;
  }

  const items = program.items || [];
  items.forEach((item, index) => {
    let text = '';
    if (item.type === 'piece') {
      const composer = item.pieceComposerSnapshot ? item.pieceComposerSnapshot + ': ' : '';
      text = composer + (item.pieceTitleSnapshot || '');
      if (item.instrument) text += ` (${item.instrument})`;
      if (item.performerNames) text += ` — ${item.performerNames}`;
    } else if (item.type === 'speech') {
      text = item.speechTitle || '';
      if (item.speechSpeaker) text += ` – ${item.speechSpeaker}`;
    } else if (item.type === 'break') {
      text = item.breakTitle || 'Pause';
    } else if (item.type === 'slot') {
      text = item.slotLabel || '';
    }

    const wrapped = wrapText(text, size, width);
    for (const line of wrapped) {
      const x = left + (width - textWidth(line, size)) / 2;
      lines.push(`BT /F1 ${size} Tf ${x} ${y} Td (${escape(line)}) Tj ET`);
      y -= 16;
    }

    if (index < items.length - 1) {
      y -= 4;
      const center = left + width / 2;
      lines.push(`${center - 4} ${y} m ${center + 4} ${y} l S`);
      y -= 16;
    }
  });

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

function lendingListPdf(title, copies) {
  const left = 50;
  const right = 545;
  const col2 = left + 80;
  const lines = [];
  let y = 800;

  function cellCenter(x1, x2, text, yPos, size = 12) {
    const width = x2 - x1;
    const x = x1 + (width - textWidth(text, size)) / 2;
    return `BT /F1 ${size} Tf ${x} ${yPos - 2} Td (${escape(text)}) Tj ET`;
  }

  lines.push(`BT /F1 18 Tf ${left} ${y} Td (${escape('Ausleihliste ' + title)}) Tj ET`);
  y -= 30;
  const topLine = y + 8;
  lines.push('0.5 w 0 0 0 RG');
  lines.push(`${left} ${topLine} m ${right} ${topLine} l S`);
  lines.push(cellCenter(left, col2, 'Nr.', y));
  lines.push(cellCenter(col2, right, 'Name', y));
  y -= 20;
  lines.push(`${left} ${y + 8} m ${right} ${y + 8} l S`);

  for (const copy of copies) {
    lines.push(cellCenter(left, col2, String(copy.copyNumber), y));
    lines.push(cellCenter(col2, right, copy.borrowerName || '', y));
    y -= 20;
    lines.push(`${left} ${y + 8} m ${right} ${y + 8} l S`);
  }

  const bottomLine = y + 8;
  lines.push(`${left} ${topLine} m ${left} ${bottomLine} l S`);
  lines.push(`${col2} ${topLine} m ${col2} ${bottomLine} l S`);
  lines.push(`${right} ${topLine} m ${right} ${bottomLine} l S`);

  const content = lines.join('\n');
  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>');
  objects.push('<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const offsets = [];
  let pdf = '%PDF-1.4\n';
  for (let i = 0; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

function participationPdf(members, events) {
  const left = 50;
  const right = 545;
  const top = 800;
  const rowHeight = 20;
  const bottomMargin = 60;
  const dateLabels = events.map(e => {
    const d = new Date(e.date);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  });
  const columns = ['Sängername', 'E-Mail', 'Stimme', 'Bezirk', 'Gemeinde', ...dateLabels];
  const colWidth = (right - left) / columns.length;

  function newPage() {
    const lines = [];
    let y = top;
    const topLine = y + 8;
    lines.push('0.5 w 0 0 0 RG');
    lines.push(`${left} ${topLine} m ${right} ${topLine} l S`);
    columns.forEach((col, i) => {
      const x = left + i * colWidth + 2;
      lines.push(`BT /F1 12 Tf ${x} ${y} Td (${escape(col)}) Tj ET`);
    });
    y -= rowHeight;
    lines.push(`${left} ${y + 8} m ${right} ${y + 8} l S`);
    return { lines, y, topLine };
  }

  function finishPage(page, isLast) {
    const bottomLine = page.y + 8;
    for (let i = 0; i <= columns.length; i++) {
      const x = left + i * colWidth;
      page.lines.push(`${x} ${page.topLine} m ${x} ${bottomLine} l S`);
    }
    if (isLast) {
      page.lines.push(`BT /F1 10 Tf ${left} ${page.y - 12} Td (${escape('Stimmen: S1,S2,A1,A2,T1,T2,B1,B2')}) Tj ET`);
      page.lines.push(`BT /F1 10 Tf ${left} ${page.y - 24} Td (${escape('Bezirke: BS,GÖ,H-NO,H-SW,HI,WF')}) Tj ET`);
    }
    pages.push(page.lines.join('\n'));
  }

  function voiceCode(v) {
    const map = {
      'Sopran I': 'S1',
      'Sopran II': 'S2',
      'Alt I': 'A1',
      'Alt II': 'A2',
      'Tenor I': 'T1',
      'Tenor II': 'T2',
      'Bass I': 'B1',
      'Bass II': 'B2'
    };
    return v ? (map[v] || v) : '';
  }

  const pages = [];
  let page = newPage();
  for (const m of members) {
    if (page.y - rowHeight < bottomMargin) {
      finishPage(page, false);
      page = newPage();
    }
    const row = [
      `${m.name || ''}${m.firstName ? ', ' + m.firstName : ''}`,
      m.email || '',
      voiceCode(m.voice),
      m.district || '',
      m.congregation || ''
    ];
    for (let i = 0; i < events.length; i++) row.push('');
    row.forEach((cell, i) => {
      const x = left + i * colWidth + 2;
      page.lines.push(`BT /F1 12 Tf ${x} ${page.y} Td (${escape(cell)}) Tj ET`);
    });
    page.y -= rowHeight;
    page.lines.push(`${left} ${page.y + 8} m ${right} ${page.y + 8} l S`);
  }
  finishPage(page, true);

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(null); // placeholder for pages root
  objects.push('<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const pageKids = [];
  for (const content of pages) {
    const contentObjNum = objects.length + 2;
    const pageObjNum = objects.length + 1;
    pageKids.push(`${pageObjNum} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageKids.join(' ')}] /Count ${pages.length} >>`;

  const offsets = [];
  let pdf = '%PDF-1.4\n';
  for (let i = 0; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

module.exports = { monthlyPlanPdf, programPdf, lendingListPdf, participationPdf };
