'use client';

export default function SearchBar({placeholder}) {
  return (
    <div className="search-bar">
      <span className="search-icon">&#128269;</span>
      <input type="search" className="search-input" placeholder={placeholder} />
      <kbd className="search-shortcut">&#8984;K</kbd>
    </div>
  );
}
