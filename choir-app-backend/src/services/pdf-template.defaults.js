const defaultPdfTemplates = {
  program: {
    name: 'Programmheft',
    page: { size: 'A4', layout: 'portrait', margin: 50 },
    header: { show: true, fontSize: 16, align: 'center', line: true, height: 30 },
    footer: { show: true, fontSize: 10, align: 'center', showDate: true, showPageNumber: true, label: 'Erstellt am', pageLabel: 'Seite', height: 24 },
    description: { fontSize: 11, align: 'center', spacingAfter: 10 },
    item: { fontSize: 12, lineHeight: 1.3, indent: 10 },
    break: { fontSize: 12, align: 'center', spacingBefore: 8, spacingAfter: 8 },
    separator: { enabled: true, width: 30, spacing: 8 }
  },
  'monthly-plan': {
    name: 'Dienstplan',
    page: { size: 'A4', layout: 'portrait', margin: 40 },
    header: { show: true, fontSize: 16, align: 'left', line: true, height: 28 },
    footer: { show: true, fontSize: 10, align: 'left', showDate: true, showPageNumber: false, label: 'Stand', pageLabel: 'Seite', height: 20 },
    subtitle: { fontSize: 12, align: 'left', spacingAfter: 6 },
    table: {
      headerFontSize: 11,
      rowFontSize: 10,
      rowHeight: 18,
      headerFill: '#efefef',
      columnWidths: [90, 50, 120, 120, 145],
      headers: ['Datum', 'Ereignis', 'Chorleiter', 'Organist', 'Notizen']
    }
  },
  'lending-list': {
    name: 'Ausleihliste',
    page: { size: 'A4', layout: 'portrait', margin: 40 },
    header: { show: true, fontSize: 16, align: 'left', line: true, height: 28 },
    footer: { show: true, fontSize: 10, align: 'left', showDate: true, showPageNumber: true, label: 'Erstellt am', pageLabel: 'Seite', height: 20 },
    table: {
      headerFontSize: 11,
      rowFontSize: 10,
      rowHeight: 18,
      columnWidths: [50, 250, 120, 120],
      headers: ['Nr.', 'Name', 'Ausleihe', 'Rückgabe']
    }
  },
  participation: {
    name: 'Teilnahmeübersicht',
    page: { size: 'A4', layout: 'landscape', margin: 30 },
    header: { show: true, fontSize: 14, align: 'left', line: true, height: 24 },
    footer: { show: true, fontSize: 9, align: 'left', showDate: true, showPageNumber: true, label: 'Erstellt am', pageLabel: 'Seite', height: 18 },
    table: {
      headerFontSize: 9,
      rowFontSize: 9,
      rowHeight: 16,
      nameWidth: 150,
      emailWidth: 200,
      voiceWidth: 25,
      districtWidth: 50,
      congregationWidth: 80
    }
  }
};

function getDefaultPdfTemplate(type) {
  return defaultPdfTemplates[type];
}

function getDefaultPdfTemplates() {
  return Object.entries(defaultPdfTemplates).map(([type, config]) => ({
    type,
    name: config.name,
    config: JSON.stringify(config, null, 2)
  }));
}

module.exports = { getDefaultPdfTemplate, getDefaultPdfTemplates };
