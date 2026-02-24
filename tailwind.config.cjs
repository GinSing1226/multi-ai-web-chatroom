/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    files: [
      './packages/renderer/index.html',
      './packages/renderer/src/**/*.{js,ts,jsx,tsx}',
      './shared/**/*.{js,ts}',
    ],
  },
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic color names for light/dark themes
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary, #e5e7eb)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'accent-color': 'var(--accent-color)',
        'border-color': 'var(--border-color)',
        'message-user-bg': 'var(--message-user-bg)',
        'message-user-text': 'var(--message-user-text)',
        'message-ai-bg': 'var(--message-ai-bg)',
        'message-ai-text': 'var(--message-ai-text)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
  // Safelist for dynamic classes
  safelist: [
    {
      pattern: /((bg|text|border)-(primary|secondary|tertiary)|accent-color|message-(user|ai)-(bg|text))/,
      variants: ['hover', 'focus'],
    },
  ],
}
