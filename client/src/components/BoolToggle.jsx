export default function BoolToggle({ name, value, onChange }) {
  return (
    <div className="bool-group">
      {[['yes', 'Yes'], ['no', 'No'], ['unknown', '?']].map(([v, label]) => (
        <div key={v} className={`bool-opt ${v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'unk'}`}>
          <input type="radio" name={name} id={`${name}-${v}`} value={v}
            checked={value === v} onChange={() => onChange(v)} />
          <label htmlFor={`${name}-${v}`}>{label}</label>
        </div>
      ))}
    </div>
  )
}
