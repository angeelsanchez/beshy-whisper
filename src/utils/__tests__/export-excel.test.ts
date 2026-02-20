import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeMockRow() {
  return {
    number: 1,
    height: 20,
    getCell: vi.fn().mockReturnValue({
      font: {},
      alignment: {},
      fill: {},
      border: {},
      numFmt: '',
    }),
    eachCell: vi.fn((cb: (cell: Record<string, unknown>) => void) => {
      cb({ fill: {}, border: {} });
    }),
  };
}

const mockWriteBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
const mockAddRow = vi.fn(makeMockRow);
const mockMergeCells = vi.fn();
const mockGetColumn = vi.fn().mockReturnValue({ width: 18 });

vi.mock('exceljs', () => {
  class MockWorkbook {
    creator = '';
    created: Date | null = null;
    xlsx = { writeBuffer: mockWriteBuffer };
    addWorksheet = vi.fn().mockReturnValue({
      addRow: mockAddRow,
      mergeCells: mockMergeCells,
      getColumn: mockGetColumn,
      properties: {},
    });
  }
  return { Workbook: MockWorkbook };
});

import { exportHabitsToExcel } from '../export-excel';

describe('exportHabitsToExcel', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL = vi.fn(() => 'blob:test');
    mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL as unknown as typeof URL.revokeObjectURL;
  });

  it('creates a workbook and triggers download', async () => {
    await exportHabitsToExcel({
      globalData: [{ label: 'L', percentage: 80 }],
      habitsData: [],
      viewLabel: 'Semana',
    });

    expect(mockWriteBuffer).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('adds rows for each data point', async () => {
    await exportHabitsToExcel({
      globalData: [
        { label: 'L', percentage: 80 },
        { label: 'M', percentage: 40 },
      ],
      habitsData: [],
      viewLabel: 'Semana',
    });

    const rowArgs = mockAddRow.mock.calls.map((c: unknown[][]) => c[0]);
    const dataRows = rowArgs.filter(
      (args: unknown) => Array.isArray(args) && typeof args[1] === 'number',
    );
    expect(dataRows).toHaveLength(2);
    expect(dataRows[0]).toEqual(['L', 80]);
    expect(dataRows[1]).toEqual(['M', 40]);
  });

  it('generates xlsx blob with correct MIME type', async () => {
    await exportHabitsToExcel({
      globalData: [{ label: 'V', percentage: 50 }],
      habitsData: [],
      viewLabel: 'Año',
    });

    const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('adds habit sections when habitsData is provided', async () => {
    await exportHabitsToExcel({
      globalData: [{ label: 'L', percentage: 80 }],
      habitsData: [
        { habitName: 'Meditar', data: [{ label: 'L', percentage: 100 }] },
      ],
      viewLabel: 'Mes',
    });

    const rowArgs = mockAddRow.mock.calls.map((c: unknown[][]) => c[0]);
    const habitHeader = rowArgs.find(
      (args: unknown) => Array.isArray(args) && args[0] === 'Meditar',
    );
    expect(habitHeader).toBeDefined();
  });
});
