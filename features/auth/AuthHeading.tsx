export function AuthHeading({
  overline,
  title,
  sub,
}: {
  overline: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-5">
      <p className="overline-track text-accent">{overline}</p>
      <h1 className="text-offset mt-1 text-2xl font-black tracking-tight">{title}</h1>
      {sub && <p className="mt-1.5 text-sm leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}
