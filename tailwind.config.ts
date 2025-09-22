import { type Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1E90FF", // Dodger Blue
          light: "#63B3FF",
          dark: "#006fd6",
        },
        primary: "#1E90FF",
        slate: colors.slate, // <-- This works
      },
    },
  },
  plugins: [],
};

export default config;