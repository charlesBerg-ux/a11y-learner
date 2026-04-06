export default function TabNav({ lists, activeIndex, onSelect }) {
  return (
    <div className="tab-nav" role="tablist" aria-label="Learning list tabs">
      {/* Mobile: native select dropdown */}
      <label className="tab-select-label" htmlFor="tab-select">
        <span className="visually-hidden">Select learning list</span>
      </label>
      <select
        id="tab-select"
        className="tab-select"
        value={activeIndex}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {lists.map((list, i) => (
          <option key={list.slug} value={i}>
            {list.label}
          </option>
        ))}
      </select>

      {/* Desktop: tab buttons */}
      <div className="tab-buttons">
        {lists.map((list, i) => (
          <button
            key={list.slug}
            role="tab"
            aria-selected={i === activeIndex}
            className={`tab-button ${i === activeIndex ? 'tab-button--active' : ''}`}
            onClick={() => onSelect(i)}
          >
            {list.label}
          </button>
        ))}
      </div>
    </div>
  );
}
