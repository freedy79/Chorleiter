function escape(text) {
  return text.replace(/[\\()]/g, c => '\\' + c);
}

function textWidth(text, size) {
  return text.length * size * 0.6;
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
  lines.push(`BT /F1 18 Tf ${left} ${y} Td (${escape('Dienstplan ' + plan.month + '/' + plan.year)}) Tj ET`);
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

  // Table rows
  for (const e of plan.entries) {
    lines.push(cellCenter(left, col2, new Date(e.date).toISOString().substring(0,10), y));
    lines.push(cellCenter(col2, col3, e.director?.name || '', y));
    lines.push(cellCenter(col3, col4, e.organist?.name || '', y));
    lines.push(cellCenter(col4, right, e.notes || '', y));
    y -= 20;
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
  objects.push('<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>'); //4
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
