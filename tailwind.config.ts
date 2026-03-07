import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Nunito'", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        carto: {
          blue: "#4A90D9",
          "blue-light": "#7BB8E8",
          "blue-pale": "#B8D8F0",
          "blue-sky": "#E8F2FB",
          steel: "#5B7FA0",
          coral: "#D35F4A",
          "coral-light": "#E8806D",
          cream: "#F5F0E8",
          "cream-light": "#FAF8F4",
          slate: "#2C3E50",
          "slate-light": "#4A5F73",
        },
      },
    },
  },
  plugins: [],
};
export default config;
