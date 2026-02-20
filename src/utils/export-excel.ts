interface ExcelChartRow {
  label: string;
  percentage: number;
}

interface ExcelHabitSection {
  habitName: string;
  data: ExcelChartRow[];
}

interface ExportExcelParams {
  readonly globalData: ExcelChartRow[];
  readonly habitsData: ExcelHabitSection[];
  readonly viewLabel: string;
}

const HEADER_FILL_COLOR = '4A2E1B';
const HEADER_FONT_COLOR = 'F5F0E1';
const ALT_ROW_FILL_COLOR = 'F5F0E1';
const ACCENT_COLOR = '8B5A2B';
const HIGH_THRESHOLD = 80;
const MID_THRESHOLD = 50;

export async function exportHabitsToExcel({
  globalData,
  habitsData,
  viewLabel,
}: ExportExcelParams): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Beshy Whisper';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Hábitos', {
    properties: { defaultColWidth: 18 },
  });

  addTitleRow(sheet, `Cumplimiento de hábitos — ${viewLabel}`);
  sheet.addRow([]);

  addSectionHeader(sheet, 'Cumplimiento global');
  addDataTable(sheet, globalData);

  for (const habit of habitsData) {
    sheet.addRow([]);
    addSectionHeader(sheet, habit.habitName);
    addDataTable(sheet, habit.data);
  }

  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 22;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `habitos-${viewLabel.toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function addTitleRow(
  sheet: import('exceljs').Worksheet,
  title: string,
): void {
  const row = sheet.addRow([title]);
  sheet.mergeCells(row.number, 1, row.number, 2);
  const cell = row.getCell(1);
  cell.font = { bold: true, size: 16, color: { argb: HEADER_FILL_COLOR } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  row.height = 30;
}

function addSectionHeader(
  sheet: import('exceljs').Worksheet,
  label: string,
): void {
  const row = sheet.addRow([label]);
  sheet.mergeCells(row.number, 1, row.number, 2);
  const cell = row.getCell(1);
  cell.font = { bold: true, size: 12, color: { argb: ACCENT_COLOR } };
  cell.border = { bottom: { style: 'medium', color: { argb: ACCENT_COLOR } } };
  row.height = 24;

  const headerRow = sheet.addRow(['Período', 'Cumplimiento (%)']);
  headerRow.height = 22;
  headerRow.eachCell(c => {
    c.font = { bold: true, size: 11, color: { argb: HEADER_FONT_COLOR } };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL_COLOR },
    };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      bottom: { style: 'thin', color: { argb: ACCENT_COLOR } },
    };
  });
}

function addDataTable(
  sheet: import('exceljs').Worksheet,
  data: ExcelChartRow[],
): void {
  data.forEach((d, idx) => {
    const row = sheet.addRow([d.label, d.percentage]);
    row.height = 20;

    const labelCell = row.getCell(1);
    labelCell.font = { size: 11 };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const valueCell = row.getCell(2);
    valueCell.numFmt = '0"%"';
    valueCell.font = {
      size: 11,
      bold: d.percentage >= HIGH_THRESHOLD,
      color: {
        argb: d.percentage >= HIGH_THRESHOLD
          ? '2E7D32'
          : d.percentage >= MID_THRESHOLD
            ? 'F57F17'
            : 'C62828',
      },
    };
    valueCell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (idx % 2 === 0) {
      row.eachCell(c => {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: ALT_ROW_FILL_COLOR },
        };
      });
    }

    row.eachCell(c => {
      c.border = {
        bottom: { style: 'hair', color: { argb: 'D2B48C' } },
      };
    });
  });
}
