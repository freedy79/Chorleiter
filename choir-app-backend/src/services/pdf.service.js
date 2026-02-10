const PDFDocument = require('pdfkit');
const { shortWeekdayDateString, germanDateString } = require('../utils/date.utils');
const { getPdfTemplateConfig } = require('./pdf-template.service');
const logger = require('../config/logger');
const db = require('../models');

function eventShort(notes) {
  const value = (notes || '').toLowerCase();
  if (/\b(gottesdienst|gd)\b/.test(value)) {
    return 'GD';
  }
  if (/\b(chorprobe|probe|cp)\b/.test(value)) {
    return 'CP';
  }
  return '';
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

function bufferFromDoc(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function createDoc(template) {
  const page = template?.page || {};
  const baseMargin = page.margin ?? 50;
  const headerHeight = template?.header?.show ? (template.header.height ?? 30) : 0;
  const footerHeight = template?.footer?.show ? (template.footer.height ?? 24) : 0;
  return new PDFDocument({
    size: page.size || 'A4',
    layout: page.layout || 'portrait',
    margins: {
      top: baseMargin + headerHeight,
      bottom: baseMargin + footerHeight,
      left: baseMargin,
      right: baseMargin
    },
    bufferPages: true
  });
}

function moveDownBy(doc, points) {
  const lineHeight = doc.currentLineHeight(true) || 12;
  doc.moveDown(points / lineHeight);
}

function applyHeaderFooter(doc, template, meta) {
  const range = doc.bufferedPageRange();
  const page = template?.page || {};
  const baseMargin = page.margin ?? 50;
  const header = template?.header || {};
  const footer = template?.footer || {};
  const headerHeight = header.show ? (header.height ?? 30) : 0;
  const footerHeight = footer.show ? (footer.height ?? 24) : 0;
  const title = meta?.title || '';
  const dateLabel = footer.label ? `${footer.label}: ` : '';
  const dateText = footer.showDate ? `${dateLabel}${meta?.date || germanDateString(new Date())}` : '';
  const pageLabel = footer.pageLabel || 'Seite';

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const width = doc.page.width;
    const contentWidth = width - baseMargin * 2;

    if (header.show && title) {
      const headerFontSize = header.fontSize ?? 14;
      const headerTop = baseMargin - headerHeight;
      const headerY = headerTop + (headerHeight - headerFontSize) / 2;
      doc.font('Helvetica').fontSize(headerFontSize).fillColor('black');
      doc.text(title, baseMargin, headerY, { width: contentWidth, align: header.align || 'center' });
      if (header.line) {
        const lineY = headerTop + headerHeight;
        doc.moveTo(baseMargin, lineY).lineTo(width - baseMargin, lineY).stroke();
      }
    }

    if (footer.show) {
      const footerFontSize = footer.fontSize ?? 10;
      const footerTop = doc.page.height - baseMargin - footerHeight;
      const footerY = footerTop + (footerHeight - footerFontSize) / 2;
      const parts = [];
      if (dateText) parts.push(dateText);
      if (footer.showPageNumber) {
        parts.push(`${pageLabel} ${i + 1} / ${range.count}`);
      }
      const footerText = parts.join(' — ');
      doc.font('Helvetica').fontSize(footerFontSize).fillColor('black');
      doc.text(footerText, baseMargin, footerY, { width: contentWidth, align: footer.align || 'center' });
    }
  }
}

function buildProgramItemText(item) {
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
  return text;
}

async function programPdf(program) {
  const template = await getPdfTemplateConfig('program');
  const doc = createDoc(template);
  const meta = {
    title: program.title || 'Programm',
    date: germanDateString(new Date())
  };

  const description = template.description || {};
  const itemConfig = template.item || {};
  const breakConfig = template.break || {};
  const separator = template.separator || {};

  doc.font('Helvetica').fontSize(description.fontSize || 11);

  if (program.description) {
    doc.text(program.description, { align: description.align || 'center' });
    moveDownBy(doc, description.spacingAfter ?? 10);
  }

  const items = program.items || [];
  items.forEach((item, index) => {
    const text = buildProgramItemText(item);
    if (item.type === 'break') {
      moveDownBy(doc, breakConfig.spacingBefore ?? 8);
      doc.font('Helvetica').fontSize(breakConfig.fontSize || 12).text(text, { align: breakConfig.align || 'center' });
      moveDownBy(doc, breakConfig.spacingAfter ?? 8);
      return;
    }

    doc.font('Helvetica').fontSize(itemConfig.fontSize || 12).text(text, {
      indent: itemConfig.indent ?? 10,
      lineGap: (itemConfig.lineHeight ?? 1.3) * (itemConfig.fontSize || 12) - (itemConfig.fontSize || 12)
    });

    if (separator.enabled && index < items.length - 1) {
      moveDownBy(doc, separator.spacing ?? 8);
      const width = separator.width ?? 30;
      const centerX = doc.page.margins.left + (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2;
      doc.moveTo(centerX - width / 2, doc.y).lineTo(centerX + width / 2, doc.y).stroke();
      moveDownBy(doc, separator.spacing ?? 8);
    }
  });

  applyHeaderFooter(doc, template, meta);
  return bufferFromDoc(doc);
}

async function monthlyPlanPdf(plan) {
  const template = await getPdfTemplateConfig('monthly-plan');
  const doc = createDoc(template);
  const meta = {
    title: `Musikplan ${plan.month}/${plan.year}`,
    date: germanDateString(plan.updatedAt ? new Date(plan.updatedAt) : new Date())
  };

  const subtitle = template.subtitle || {};
  const table = template.table || {};
  const headers = table.headers || ['Datum', 'Ereignis', 'Chorleiter', 'Organist', 'Notizen'];

  doc.font('Helvetica').fontSize(subtitle.fontSize || 12);
  if (plan.choir?.name) {
    doc.text(plan.choir.name, { align: subtitle.align || 'left' });
    moveDownBy(doc, subtitle.spacingAfter ?? 6);
  }

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const columnWidths = table.columnWidths || [90, 50, 120, 120, right - left - 380];
  const rowHeight = table.rowHeight || 18;

  function drawTableHeader() {
    const headerFill = table.headerFill || null;
    const y = doc.y;
    if (headerFill) {
      doc.save();
      doc.rect(left, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight).fill(headerFill);
      doc.restore();
    }
    doc.font('Helvetica-Bold').fontSize(table.headerFontSize || 11).fillColor('black');
    let x = left;
    headers.forEach((headerText, i) => {
      doc.text(headerText, x + 4, y + 4, { width: columnWidths[i] - 8, align: 'center' });
      x += columnWidths[i];
    });
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).stroke();

    x = left;
    columnWidths.forEach(w => {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      x += w;
    });
    doc.moveTo(right, y).lineTo(right, y + rowHeight).stroke();

    doc.y = y + rowHeight;
  }

  function drawRow(cells) {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawTableHeader();
    }
    const y = doc.y;
    doc.font('Helvetica').fontSize(table.rowFontSize || 10).fillColor('black');
    let x = left;
    cells.forEach((cell, i) => {
      doc.text(cell, x + 4, y + 4, { width: columnWidths[i] - 8, height: rowHeight - 6, ellipsis: true, align: 'center' });
      x += columnWidths[i];
    });
    doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).stroke();
    x = left;
    columnWidths.forEach(w => {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      x += w;
    });
    doc.moveTo(right, y).lineTo(right, y + rowHeight).stroke();
    doc.y = y + rowHeight;
  }

  drawTableHeader();
  for (const entry of plan.entries || []) {
    const cells = [
      shortWeekdayDateString(new Date(entry.date)),
      eventShort(entry.notes),
      entry.director?.name || '',
      entry.organist?.name || '',
      entry.notes || ''
    ];
    drawRow(cells);
  }

  applyHeaderFooter(doc, template, meta);
  return bufferFromDoc(doc);
}

async function lendingListPdf(title, copies) {
  const template = await getPdfTemplateConfig('lending-list');
  const doc = createDoc(template);
  const meta = {
    title: `Ausleihliste ${title}`,
    date: germanDateString(new Date())
  };

  const table = template.table || {};
  const headers = table.headers || ['Nr.', 'Name', 'Ausleihe', 'Rückgabe'];
  const rowHeight = table.rowHeight || 18;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const columnWidths = table.columnWidths || [50, 250, 120, right - left - 420];

  function drawTableHeader() {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(table.headerFontSize || 11).fillColor('black');
    let x = left;
    headers.forEach((headerText, i) => {
      doc.text(headerText, x + 4, y + 4, { width: columnWidths[i] - 8, align: 'center' });
      x += columnWidths[i];
    });
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).stroke();

    x = left;
    columnWidths.forEach(w => {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      x += w;
    });
    doc.moveTo(right, y).lineTo(right, y + rowHeight).stroke();
    doc.y = y + rowHeight;
  }

  function drawRow(cells) {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawTableHeader();
    }
    const y = doc.y;
    doc.font('Helvetica').fontSize(table.rowFontSize || 10).fillColor('black');
    let x = left;
    cells.forEach((cell, i) => {
      doc.text(cell, x + 4, y + 4, { width: columnWidths[i] - 8, height: rowHeight - 6, ellipsis: true, align: 'center' });
      x += columnWidths[i];
    });
    doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).stroke();
    x = left;
    columnWidths.forEach(w => {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      x += w;
    });
    doc.moveTo(right, y).lineTo(right, y + rowHeight).stroke();
    doc.y = y + rowHeight;
  }

  drawTableHeader();
  for (const copy of copies) {
    drawRow([
      String(copy.copyNumber),
      copy.borrowerName || '',
      formatDate(copy.borrowedAt),
      formatDate(copy.returnedAt)
    ]);
  }

  applyHeaderFooter(doc, template, meta);
  return bufferFromDoc(doc);
}

async function participationPdf(members, events, availabilities = []) {
  logger.debug(`Generating participation PDF: ${members.length} members, ${events.length} events`);
  const template = await getPdfTemplateConfig('participation');
  const doc = createDoc(template);
  const meta = {
    title: 'Teilnahmeübersicht',
    date: germanDateString(new Date())
  };

  const districtEntries = await db.district.findAll();
  const districtCodes = {};
  for (const d of districtEntries) {
    if (!d.name) continue;
    const nameKey = d.name.trim();
    const codeVal = (d.code || '').trim();
    if (codeVal) {
      districtCodes[nameKey] = codeVal;
      districtCodes[codeVal] = codeVal;
    } else {
      districtCodes[nameKey] = nameKey;
    }
  }

  const table = template.table || {};
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const rowHeight = table.rowHeight || 16;
  const nameWidth = table.nameWidth || 150;
  const emailWidth = table.emailWidth || 200;
  const voiceWidth = table.voiceWidth || 25;
  const congregationWidth = table.congregationWidth || 80;

  const hasUnknownDistrict = members.some(m => {
    if (!m.district) return true;
    const key = typeof m.district === 'string'
      ? m.district.trim()
      : ((m.district.code || m.district.name || '').trim());
    return !districtCodes[key];
  });
  const districtWidth = hasUnknownDistrict ? (table.districtWidth || 50) : Math.max(40, table.districtWidth || 40);
  const fixedWidth = nameWidth + emailWidth + voiceWidth + districtWidth + congregationWidth;
  const remainingWidth = (right - left) - fixedWidth;
  const eventWidth = events.length ? remainingWidth / events.length : 0;
  const columnWidths = [nameWidth, emailWidth, voiceWidth, districtWidth, congregationWidth,
    ...Array(events.length).fill(eventWidth)];

  const eventDates = events.map(e => new Date(e.date));
  const dateLabels = eventDates.map(d => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }));
  const headers = ['Name', 'E-Mail', 'St', 'Bez.', 'Gemeinde', ...dateLabels];

  const availMap = new Map();
  for (const a of availabilities) {
    const dateKey = (a.date instanceof Date ? a.date : new Date(a.date)).toISOString().slice(0, 10);
    if (!availMap.has(a.userId)) availMap.set(a.userId, {});
    availMap.get(a.userId)[dateKey] = a.status;
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

  function districtCode(d) {
    if (!d) return '';
    const key = typeof d === 'string' ? d.trim() : ((d.code || d.name || '')).trim();
    return districtCodes[key] || key;
  }

  function drawHeader() {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(table.headerFontSize || 9).fillColor('black');
    let x = left;
    headers.forEach((headerText, i) => {
      doc.text(headerText, x + 2, y + 2, { width: columnWidths[i] - 4, align: 'center' });
      x += columnWidths[i];
    });
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).stroke();

    x = left;
    columnWidths.forEach(w => {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      x += w;
    });
    doc.moveTo(right, y).lineTo(right, y + rowHeight).stroke();
    doc.y = y + rowHeight;
  }

  function drawRow(cells) {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let x = left;
    cells.forEach((cell, i) => {
      if (i >= 5) {
        doc.font('Helvetica').fontSize(table.rowFontSize || 9).text(cell, x + 2, y + 2, {
          width: columnWidths[i] - 4,
          align: 'center'
        });
      } else {
        doc.font('Helvetica').fontSize(table.rowFontSize || 9).text(cell, x + 2, y + 2, {
          width: columnWidths[i] - 4,
          align: 'left'
        });
      }
      x += columnWidths[i];
    });
    doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).stroke();
    x = left;
    columnWidths.forEach(w => {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      x += w;
    });
    doc.moveTo(right, y).lineTo(right, y + rowHeight).stroke();
    doc.y = y + rowHeight;
  }

  drawHeader();
  for (const m of members) {
    const row = [
      `${m.name || ''}${m.firstName ? ', ' + m.firstName : ''}`,
      m.email || '',
      voiceCode(m.voice),
      districtCode(m.district),
      m.congregation || ''
    ];
    const userAvail = availMap.get(m.id) || {};
    for (const d of eventDates) {
      const key = d.toISOString().slice(0, 10);
      const status = userAvail[key];
      let mark = '';
      if (status === 'AVAILABLE') mark = '✓';
      else if (status === 'MAYBE') mark = '?';
      else if (status === 'UNAVAILABLE') mark = '-';
      row.push(mark);
    }
    drawRow(row);
  }

  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(9).text('Stimmen: S1,S2,A1,A2,T1,T2,B1,B2');
  const districtLegend = Array.from(new Set(Object.values(districtCodes))).join(',');
  doc.font('Helvetica').fontSize(9).text(`Bezirke: ${districtLegend}`);

  applyHeaderFooter(doc, template, meta);
  return bufferFromDoc(doc);
}

module.exports = { monthlyPlanPdf, programPdf, lendingListPdf, participationPdf };
