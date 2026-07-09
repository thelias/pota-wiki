export default function ScaleToggle({ name, value, onChange, options, colors }) {
  return (
    <div className="bool-group">
      {options.map(([v, label], i) => (
        <div key={v} className="bool-opt">
          <input type="radio" name={name} id={`${name}-${v}`} value={v}
            checked={value === v} onChange={() => onChange(value === v ? '' : v)} />
          <label htmlFor={`${name}-${v}`} style={{
            background: value === v ? colors[i] : undefined,
            color:      value === v ? '#fff'     : undefined,
          }}>
            {label}
          </label>
        </div>
      ))}
    </div>
  )
}
