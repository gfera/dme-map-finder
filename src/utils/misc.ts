export const findPattern = (buffer: Uint8Array, bytes: number[], start = 0) => {
  const idx = buffer.subarray(start).findIndex((_, i, buf) =>
    bytes.every((byte, pos) => {
      return buf[i + pos] === byte;
    })
  );
  return idx === -1 ? idx : idx + start;
};
