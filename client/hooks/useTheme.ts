import { Colors } from "@/constants/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { isDark, theme } = useThemeContext();

  return {
    theme,
    isDark,
  };
}
