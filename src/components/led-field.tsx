const activeCells = new Set([
  7, 8, 20, 21, 22, 31, 32, 33, 34, 42, 43, 44, 45, 46, 54, 55, 56, 57,
  58, 66, 67, 68, 69, 70, 79, 80, 81, 82, 92, 93, 94, 104, 105, 116,
]);

export function LedField() {
  return (
    <div className="led-board" aria-label="Animated LED pattern preview">
      <div className="board-topline">
        <span>live preview</span>
        <span>144 px / 60 fps</span>
      </div>
      <div className="led-grid" aria-hidden="true">
        {Array.from({ length: 126 }, (_, index) => (
          <i
            key={index}
            className={activeCells.has(index) ? `lit tone-${index % 5}` : ""}
            style={{ "--delay": `${(index % 14) * 55}ms` } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="board-readout">
        <span>NOISE_16</span>
        <span className="readout-line" />
        <strong>AURORA_03</strong>
      </div>
    </div>
  );
}
