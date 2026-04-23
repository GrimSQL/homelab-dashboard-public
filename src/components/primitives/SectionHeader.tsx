export function SectionHeader({ num, title, sub }: { num: string; title: string; sub?: string }) {
  return (
    <div>
      <h2 className="section"><span className="num">{num}</span>{title}</h2>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  );
}
