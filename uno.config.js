import { defineConfig, presetWind3, presetAttributify } from 'unocss'

const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

function rangeWithPrefixes(n, base, prefixes = ['']) {
  return prefixes.flatMap(prefix =>
    range(n, i => `${prefix}${base}-${i}`)
  );
}

export default defineConfig({
  content: {
    filesystem: ['./**/*.{html,md,js}'],
  },
  presets: [
    presetAttributify(),
    presetWind3({
      dark: 'media'
    }),
  ],
  theme: {
    colors: {
      blockBg: 'var(--block-background-color)',
      bg: 'var(--background-color)',
      textColor: 'var(--text-color)'
    }
  },
  shortcuts: {
    'small-button': 'bg-blockBg px-2 py-1 no-underline hover:no-underline rounded border border-solid border-bg hover:border-textColor transition',
    'round-sticker': 'bg-blockBg rounded-full shadow-sm p-4'
  },
  safelist: [
    'text-sm', 'text-md', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl',

    ...range(10, i => `opacity-${i * 10}`),
    ...rangeWithPrefixes(5, 'rotate', ['', '-']),
    ...rangeWithPrefixes(30, 'w', ['', 'md:', 'lg:']),
    ...rangeWithPrefixes(30, 'h', ['', 'md:']),
    ...rangeWithPrefixes(30, 'right', ['', 'md:', '-', 'md:-']),
    ...rangeWithPrefixes(30, 'top', ['', '-']),

    // special cases
    'absolute',
    'w-[calc(25%_-_1rem)]',
    'w-[calc(50%_-_2rem)]',
    'w-[10rem]',
    'sm:w-full',
  ]
})
