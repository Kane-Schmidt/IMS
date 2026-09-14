export default function PrintableLabels({ title, labels, onDone }) {
  return (
    <div className="printable-labels-page">
      <div className="printable-labels-toolbar no-print">
        <h1>{title}</h1>
        <div className="form-actions">
          <button className="btn-primary" onClick={() => window.print()}>
            Print Labels
          </button>
          <button className="btn-secondary" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
      <div className="label-sheet">
        {labels.map((label) => (
          <div className="asset-label" key={label.id}>
            <div className="asset-label-heading">{label.heading}</div>
            <div className="asset-label-barcode">{label.code}</div>
            {label.lines.map((line) => (
              <div className="asset-label-line" key={line}>
                {line}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
