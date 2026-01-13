import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default [
  // ES Module build (unminified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/humanly-tracker.esm.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: './src',
      }),
    ],
  },
  // UMD build (unminified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/humanly-tracker.js',
      format: 'umd',
      name: 'HumanlyTracker',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // UMD build (minified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/humanly-tracker.min.js',
      format: 'umd',
      name: 'HumanlyTracker',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
      terser({
        compress: {
          passes: 2,
          pure_getters: true,
          unsafe: true,
        },
        mangle: {
          properties: {
            regex: /^_/,
          },
        },
        format: {
          comments: false,
        },
      }),
    ],
  },
];
