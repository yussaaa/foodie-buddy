/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // 与 Web 端保持一致的品牌色
        brand: {
          DEFAULT: "#f97316", // orange-500
          dark: "#ea580c",    // orange-600
        },
        surface: {
          DEFAULT: "#1a1a1a",
          elevated: "#242424",
          card: "#2a2a2a",
        },
      },
    },
  },
  plugins: [],
};
