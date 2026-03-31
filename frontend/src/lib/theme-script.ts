const THEME_STORAGE_KEY = "swiss-mail-theme";

export function getThemeInitScript() {
  return `(() => {
    try {
      const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
      const stored = window.localStorage.getItem(storageKey);
      const theme = stored === "light" || stored === "dark"
        ? stored
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.classList.remove("dark");
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    }
  })();`;
}
