function escape(text) {
  return text.replace(/[\\()]/g, c => '\\' + c);
}

function monthlyPlanPdf(plan) {
  const lines = [];
  let y = 800;
  lines.push(`BT /F1 18 Tf 50 ${y} Td (${escape('Dienstplan ' + plan.month + '/' + plan.year)}) Tj ET`);
  y -= 30;
  lines.push(`BT /F1 12 Tf 50 ${y} Td (${escape('Datum - Chorleiter - Organist - Notizen')}) Tj ET`);
  for (const e of plan.entries) {
    y -= 20;
    const parts = [
      new Date(e.date).toISOString().substring(0,10),
      e.director?.name || '',
      e.organist?.name || '',
      e.notes || ''
    ];
    lines.push(`BT /F1 12 Tf 50 ${y} Td (${escape(parts.join(' - '))}) Tj ET`);
  }
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
