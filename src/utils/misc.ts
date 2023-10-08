export const findPattern = (buffer: Uint8Array, bytes: number[], start = 0) => {
  const idx = buffer.subarray(start).findIndex((_, i, buf) =>
    bytes.every((byte, pos) => {
      return buf[i + pos] === byte;
    })
  );
  return idx === -1 ? idx : idx + start;
};

// Cubic Inches = RPM / 16.38706
// CFM = (Cubic Inches * RPM * Vol Efficiency) / 3456
// Liters x Min = CFM * 28.31658
