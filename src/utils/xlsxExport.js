// FILE: src/utils/xlsxExport.js
//
// Produces fully-styled .xlsx attendance register files matching the
// official printed format: Department header, TEACHER/CLASS NAME row,
// MONTH/DATE/LEC header rows, P/A grid, Att + Att% columns with live
// formulas — plus Arial 8pt fonts, thin borders, and proper alignment
// on every cell, matching the original register sheet pixel-for-pixel.
//
import XLSX from 'xlsx-js-style';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const UTF8 = 'utf8';

// ── Style presets (matching the original printed register) ───────────────────

const THIN_BORDER = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

const FONT_BASE = { name: 'Arial', sz: 8 };
const FONT_TITLE = { name: 'Arial', sz: 12, bold: true };
const FONT_BOLD = { name: 'Arial', sz: 8, bold: true };

function styleCell(value, opts = {}) {
  const {
    bold = false,
    halign = 'center',
    valign = 'center',
    wrap = false,
    title = false,
  } = opts;

  return {
    v: value,
    t: typeof value === 'number' ? 'n' : 's',
    s: {
      font: title ? FONT_TITLE : bold ? FONT_BOLD : FONT_BASE,
      alignment: { horizontal: halign, vertical: valign, wrapText: wrap },
      border: THIN_BORDER,
    },
  };
}

function formulaCell(formula, opts = {}) {
  const { halign = 'left', valign = 'center' } = opts;
  return {
    f: formula,
    t: 'n',
    s: {
      font: FONT_BASE,
      alignment: { horizontal: halign, vertical: valign },
      border: THIN_BORDER,
    },
  };
}

function emptyCell() {
  return {
    v: '',
    t: 's',
    s: {
      font: FONT_BASE,
      border: THIN_BORDER,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ── Core sheet builder ──────────────────────────────────────────────────────
//
// Builds a fully-styled worksheet object directly (not via aoa_to_sheet,
// since we need per-cell style objects which aoa_to_sheet does not support).

function buildClassSheet(classObj, studentsInClass, attendance, sortedDates, schoolName) {
  const PREFIX_COLS = 3; // S.N., REG NUMBER, STUDENT NAME
  const numDates = sortedDates.length;
  const attCol = PREFIX_COLS + numDates + 1; // 1-indexed "Att" column
  const attPctCol = attCol + 1; // "Att %" column

  // Row 3 has fixed-position fields regardless of date count; keep the grid
  // wide enough to safely hold them without sparse-array issues.
  const MIN_ROW3_COLS = 19;
  const totalCols = Math.max(attPctCol, MIN_ROW3_COLS);

  const ws = {};
  const merges = [];
  let maxRow = 0;

  function setCell(r, c, cellObj) {
    const addr = XLSX.utils.encode_cell({ r, c });
    ws[addr] = cellObj;
    if (r > maxRow) maxRow = r;
  }

  function fillRowBlank(r, fromCol, toCol) {
    for (let c = fromCol; c < toCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) setCell(r, c, emptyCell());
    }
  }

  // ── Row 1 (index 0): Title — school name (falls back to a sensible
  // default if a teacher hasn't set one yet in Settings) ──────────────
  setCell(0, 1, styleCell(schoolName || 'My School', { title: true }));
  merges.push({ s: { r: 0, c: 1 }, e: { r: 0, c: attPctCol - 1 } });
  fillRowBlank(0, 0, totalCols);

  // ── Row 2 (index 1): TEACHER NAME ──────────────────────────────────
  setCell(1, 0, styleCell('TEACHER NAME :', { bold: true, halign: 'left' }));
  setCell(1, 2, styleCell(classObj.teacher || '', { halign: 'left' }));
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } });
  merges.push({ s: { r: 1, c: 2 }, e: { r: 1, c: attPctCol - 1 } });
  fillRowBlank(1, 0, totalCols);

  // ── Row 3 (index 2): CLASS NAME / Total Classes / dates range ──────
  setCell(2, 0, styleCell('CLASS NAME     :', { bold: true, halign: 'left' }));
  setCell(2, 2, styleCell(classObj.name || '', { halign: 'left' }));
  setCell(2, 3, styleCell('Total Classess :', { bold: true, halign: 'right' }));
  setCell(2, 9, styleCell(numDates, { halign: 'left' }));
  setCell(2, 12, styleCell(classObj.start || '', { halign: 'left' }));
  setCell(2, 16, styleCell('To :', { bold: true, halign: 'right' }));
  setCell(2, 18, styleCell(classObj.end || '', { halign: 'left' }));
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 1 } });
  merges.push({ s: { r: 2, c: 9 }, e: { r: 2, c: 10 } });
  merges.push({ s: { r: 2, c: 12 }, e: { r: 2, c: 15 } });
  merges.push({ s: { r: 2, c: 16 }, e: { r: 2, c: 17 } });
  merges.push({ s: { r: 2, c: 18 }, e: { r: 2, c: 21 } });
  fillRowBlank(2, 0, totalCols);

  // ── Row 4 (index 3): S.N. | MONTH > | month numbers ... | Att ───────
  setCell(3, 0, styleCell('S.N.', { bold: true }));
  setCell(3, 1, styleCell('MONTH >', { bold: true, halign: 'right' }));
  let dCol = PREFIX_COLS;
  sortedDates.forEach((dateStr) => {
    const { month } = parseDateStr(dateStr);
    setCell(3, dCol, styleCell(month, { halign: 'center' }));
    dCol++;
  });
  setCell(3, attCol - 1, styleCell('Att', { bold: true }));
  merges.push({ s: { r: 3, c: 0 }, e: { r: 5, c: 0 } }); // A4:A6
  merges.push({ s: { r: 3, c: attCol - 1 }, e: { r: 5, c: attCol - 1 } });
  merges.push({ s: { r: 3, c: attPctCol - 1 }, e: { r: 5, c: attPctCol - 1 } });
  fillRowBlank(3, 0, totalCols);

  // ── Row 5 (index 4): DATE >  | day numbers ──────────────────────────
  setCell(4, 1, styleCell('                                DATE >', { bold: true, halign: 'right', wrap: true }));
  dCol = PREFIX_COLS;
  sortedDates.forEach((dateStr) => {
    const { day } = parseDateStr(dateStr);
    setCell(4, dCol, styleCell(day, { halign: 'center' }));
    dCol++;
  });
  merges.push({ s: { r: 4, c: 1 }, e: { r: 4, c: 2 } });
  fillRowBlank(4, 0, totalCols);

  // ── Row 6 (index 5): REG NUMBER | STUDENT NAME .. LEC > | lec numbers
  setCell(5, 1, styleCell('REG NUMBER', { bold: true }));
  setCell(5, 2, styleCell('STUDENT NAME                 LEC >', { bold: true, halign: 'left' }));
  dCol = PREFIX_COLS;
  sortedDates.forEach((_, i) => {
    setCell(5, dCol, styleCell(i + 1, { halign: 'center' }));
    dCol++;
  });
  fillRowBlank(5, 0, totalCols);

  // ── Student data rows ────────────────────────────────────────────────
  const headerRowCount = 6;
  studentsInClass.forEach((student, idx) => {
    const r = headerRowCount + idx; // 0-indexed row
    const excelRow = r + 1; // 1-indexed excel row for formulas

    setCell(r, 0, styleCell(idx + 1, { halign: 'center' }));
    setCell(r, 1, styleCell(student.reg, { halign: 'center' }));
    setCell(r, 2, styleCell(student.name, { halign: 'left' }));

    let dc = PREFIX_COLS;
    sortedDates.forEach((dateStr) => {
      const key = `${dateStr}_${classObj.id}`;
      const record = attendance[key];
      const status = record ? (record[student.id] || 'A') : '-';
      setCell(r, dc, styleCell(status, { halign: 'center' }));
      dc++;
    });

    const firstDateColLetter = colLetter(PREFIX_COLS + 1);
    const lastDateColLetter = colLetter(PREFIX_COLS + numDates);
    const attColLetter = colLetter(attCol);

    if (numDates > 0) {
      setCell(
        r,
        attCol - 1,
        formulaCell(`COUNTIF(${firstDateColLetter}${excelRow}:${lastDateColLetter}${excelRow},"P")`)
      );
      setCell(
        r,
        attPctCol - 1,
        formulaCell(`ROUND(${attColLetter}${excelRow}/${numDates}*100,1)`)
      );
    } else {
      setCell(r, attCol - 1, styleCell(0, { halign: 'left' }));
      setCell(r, attPctCol - 1, styleCell(0, { halign: 'left' }));
    }

    fillRowBlank(r, 0, totalCols);
  });

  // ── Sheet metadata ───────────────────────────────────────────────────
  const lastRow = Math.max(maxRow, headerRowCount + studentsInClass.length - 1);
  ws['!ref'] = XLSX.utils.encode_range(
    { r: 0, c: 0 },
    { r: lastRow, c: totalCols - 1 }
  );
  ws['!merges'] = merges;

  // Column widths (matching original: A narrow, B medium, C wide, dates narrow)
  const cols = [];
  for (let i = 0; i < totalCols; i++) {
    if (i === 0) cols.push({ wch: 5 });
    else if (i === 1) cols.push({ wch: 14 });
    else if (i === 2) cols.push({ wch: 26 });
    else cols.push({ wch: 4 });
  }
  ws['!cols'] = cols;

  // Row heights (header rows + data rows match the original's ~13-15pt)
  const rows = [];
  for (let i = 0; i <= lastRow; i++) {
    rows.push({ hpt: i < headerRowCount ? 13 : 15 });
  }
  ws['!rows'] = rows;

  return ws;
}

async function writeAndShareWorkbook(wb, fileName, dialogTitle) {
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileUri = FileSystem.documentDirectory + fileName;

  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: 'base64',
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: dialogTitle || 'Export Attendance',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }
}

// ── Public exports ────────────────────────────────────────────────────────────

export async function exportAttendanceXLSX(classObj, studentsInClass, attendance, allDates, schoolName) {
  try {
    const sortedDates = [...allDates].sort();
    const ws = buildClassSheet(classObj, studentsInClass, attendance, sortedDates, schoolName);

    const wb = XLSX.utils.book_new();
    const sheetName = (classObj.name || 'Class').substring(0, 31).replace(/[\\/?*\[\]:]/g, '');
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Attendance');

    const fileName = `${(classObj.name || 'Class').replace(/\s+/g, '_')}_attendance.xlsx`;
    await writeAndShareWorkbook(wb, fileName, 'Export Attendance XLSX');
    return true;
  } catch (e) {
    console.error('exportAttendanceXLSX error:', e);
    throw e;
  }
}

export async function exportAllXLSX(classes, students, attendance, schoolName) {
  try {
    const wb = XLSX.utils.book_new();
    const usedNames = new Set();

    classes.forEach((classObj) => {
      const studentsInClass = students.filter((s) => s.classId === classObj.id);

      const allDates = Object.keys(attendance)
        .filter((k) => {
          const parts = k.split('_');
          const keyClassId = parts[parts.length - 1];
          return keyClassId === String(classObj.id);
        })
        .map((k) => {
          const parts = k.split('_');
          parts.pop();
          return parts.join('_');
        })
        .sort();

      if (allDates.length === 0 && studentsInClass.length === 0) return;

      const ws = buildClassSheet(classObj, studentsInClass, attendance, allDates, schoolName);

      let sheetName = (classObj.name || 'Class').substring(0, 31).replace(/[\\/?*\[\]:]/g, '');
      if (!sheetName) sheetName = 'Class';
      let finalName = sheetName;
      let n = 2;
      while (usedNames.has(finalName)) {
        finalName = `${sheetName.substring(0, 28)}_${n}`;
        n++;
      }
      usedNames.add(finalName);

      XLSX.utils.book_append_sheet(wb, ws, finalName);
    });

    if (wb.SheetNames.length === 0) {
      throw new Error('No attendance data found for any class.');
    }

    const fileName = `EduAttend_all_classes_${new Date().toISOString().split('T')[0]}.xlsx`;
    await writeAndShareWorkbook(wb, fileName, 'Export All Attendance XLSX');
    return true;
  } catch (e) {
    console.error('exportAllXLSX error:', e);
    throw e;
  }
}

export async function exportBackupJSON(classes, students, attendance, editHistory, settings) {
  try {
    const data = { classes, students, attendance, editHistory, settings: settings || {} };
    const jsonContent = JSON.stringify(data, null, 2);
    const fileName = `EduAttend_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, jsonContent, { encoding: UTF8 });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export EduAttend Backup',
      });
    }
    return true;
  } catch (e) {
    console.error('exportBackupJSON error:', e);
    throw e;
  }
}
