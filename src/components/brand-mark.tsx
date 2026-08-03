export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}
