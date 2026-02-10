import { FileSizePipe } from './file-size.pipe';

describe('FileSizePipe', () => {
  let pipe: FileSizePipe;

  beforeEach(() => {
    pipe = new FileSizePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('kilobytes (< 1024 kB)', () => {
    it('should format small files in kB', () => {
      expect(pipe.transform(500)).toBe('0.5 kB');
      expect(pipe.transform(1024)).toBe('1.0 kB');
      expect(pipe.transform(1536)).toBe('1.5 kB');
      expect(pipe.transform(10240)).toBe('10.0 kB');
    });

    it('should format with custom decimal places', () => {
      expect(pipe.transform(1536, 0)).toBe('2 kB');
      expect(pipe.transform(1536, 2)).toBe('1.50 kB');
      expect(pipe.transform(1536, 3)).toBe('1.500 kB');
    });

    it('should handle very small files', () => {
      expect(pipe.transform(1)).toBe('0.0 kB');
      expect(pipe.transform(100)).toBe('0.1 kB');
      expect(pipe.transform(512)).toBe('0.5 kB');
    });

    it('should handle files just under 1 MB', () => {
      expect(pipe.transform(1048575)).toBe('1024.0 kB');
    });
  });

  describe('megabytes (>= 1024 kB)', () => {
    it('should format files in MB', () => {
      expect(pipe.transform(1048576)).toBe('1.0 MB'); // Exactly 1 MB
      expect(pipe.transform(2097152)).toBe('2.0 MB'); // 2 MB
      expect(pipe.transform(5242880)).toBe('5.0 MB'); // 5 MB
    });

    it('should format fractional MB correctly', () => {
      expect(pipe.transform(1572864)).toBe('1.5 MB'); // 1.5 MB
      expect(pipe.transform(2621440)).toBe('2.5 MB'); // 2.5 MB
    });

    it('should format with custom decimal places', () => {
      expect(pipe.transform(1572864, 0)).toBe('2 MB');
      expect(pipe.transform(1572864, 2)).toBe('1.50 MB');
      expect(pipe.transform(1572864, 3)).toBe('1.500 MB');
    });

    it('should handle large files', () => {
      expect(pipe.transform(104857600)).toBe('100.0 MB'); // 100 MB
      expect(pipe.transform(1073741824)).toBe('1024.0 MB'); // 1 GB (shown as MB)
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should handle zero bytes', () => {
      expect(pipe.transform(0)).toBe('0.0 kB');
    });

    it('should handle fractional bytes by converting to decimal', () => {
      expect(pipe.transform(1536.7)).toBe('1.5 kB');
    });
  });

  describe('invalid inputs', () => {
    it('should return empty string for non-number types', () => {
      expect(pipe.transform('1536' as any)).toBe('');
      expect(pipe.transform({} as any)).toBe('');
      expect(pipe.transform([] as any)).toBe('');
    });

    it('should return empty string for NaN', () => {
      expect(pipe.transform(NaN)).toBe('');
    });
  });

  describe('real-world file sizes', () => {
    it('should format typical document sizes', () => {
      expect(pipe.transform(15360)).toBe('15.0 kB'); // Small PDF
      expect(pipe.transform(102400)).toBe('100.0 kB'); // Word document
      expect(pipe.transform(512000)).toBe('500.0 kB'); // Larger document
    });

    it('should format typical image sizes', () => {
      expect(pipe.transform(204800)).toBe('200.0 kB'); // JPEG
      expect(pipe.transform(1048576)).toBe('1.0 MB'); // PNG
      expect(pipe.transform(3145728)).toBe('3.0 MB'); // High-res image
    });

    it('should format typical audio file sizes', () => {
      expect(pipe.transform(5242880)).toBe('5.0 MB'); // MP3 song
      expect(pipe.transform(52428800)).toBe('50.0 MB'); // High-quality audio
    });
  });
});
