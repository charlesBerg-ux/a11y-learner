const OTHER_LINKS = {
  'Reference sites': [
    { label: 'Magenta A11y', url: 'https://www.magentaa11y.com' },
    { label: 'Web Accessibility Survey', url: 'https://webaccessibilitysurvey.com/' },
    { label: 'IAAP', url: 'https://www.accessibilityassociation.org/s/' },
  ],
  'Tutorials': [
    { label: 'FreeCodeCamp', url: 'https://www.freecodecamp.org' },
    { label: 'W3Schools', url: 'https://www.w3schools.com/html/' },
  ],
  'Companies': [
    { label: 'TPGI', url: 'https://www.tpgi.com' },
    { label: 'Easy Surf', url: 'https://easysurf.ca/' },
    { label: 'Fable', url: 'https://makeitfable.com' },
    { label: 'Deque', url: 'https://www.deque.com' },
    { label: 'Bureau of Internet Accessibility', url: 'https://www.boia.org/' },
  ],
};

export default function ManualFallback() {
  return (
    <section className="manual-fallback" aria-label="Other links">
      <h2>Other links</h2>
      {Object.entries(OTHER_LINKS).map(([category, links]) => (
        <div key={category} className="other-links-category">
          <h3>{category}</h3>
          <ul className="other-links-list">
            {links.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
