export type PanelProps = {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  head?: React.ReactNode;
  flush?: boolean;
  children?: React.ReactNode;
};

export function Panel({ title, meta, head, flush, children }: PanelProps) {
  return (
    <div className={"panel " + (flush ? "flush" : "")}>
      {(title || head || meta) && (
        <div className="panel-head">
          {title && <h3>{title}</h3>}
          {head}
          {meta && <span className="meta">{meta}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
