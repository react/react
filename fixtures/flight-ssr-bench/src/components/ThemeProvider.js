'use client';

export default function ThemeProvider({theme, children}) {
  return (
    <div className={'theme-' + theme} data-theme={theme}>
      {children}
    </div>
  );
}
