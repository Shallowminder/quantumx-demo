export function MiniSparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);

  return (
    <div className="flex h-5 items-end gap-1" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="theme-spark-bar w-1.5 rounded-full"
          style={{ height: `${Math.max(4, (value / max) * 20)}px` }}
        />
      ))}
    </div>
  );
}
