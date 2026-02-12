import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import fsdPlugin from 'eslint-plugin-fsd-lint';
import unusedImports from 'eslint-plugin-unused-imports';

/** Custom FSD layers: app → pages → modules → features → entities → commons */
const fsdLayers = {
  app: {
    pattern: 'app',
    priority: 1,
    allowedToImport: ['pages', 'modules', 'features', 'entities', 'commons'],
  },
  pages: {
    pattern: 'pages',
    priority: 2,
    allowedToImport: ['modules', 'features', 'entities', 'commons'],
  },
  modules: {
    pattern: 'modules',
    priority: 3,
    allowedToImport: ['features', 'entities', 'commons'],
  },
  features: {
    pattern: 'features',
    priority: 4,
    allowedToImport: ['entities', 'commons'],
  },
  entities: {
    pattern: 'entities',
    priority: 5,
    allowedToImport: ['commons'],
  },
  commons: {
    pattern: 'commons',
    priority: 6,
    allowedToImport: [],
  },
};

const fsdAlias = { value: '@', withSlash: true };

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Prettier — eslint-config-prettier로 충돌 룰만 비활성화
  // prettier 자체는 lint-staged에서 별도 실행
  prettierConfig,

  // Unused imports
  {
    plugins: { 'unused-imports': unusedImports },
    rules: {
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  // FSD Architecture
  {
    plugins: { fsd: fsdPlugin },
    rules: {
      'fsd/forbidden-imports': ['error', { alias: fsdAlias, layers: fsdLayers }],
      'fsd/no-relative-imports': ['error', { allowSameSlice: true, allowTypeImports: false }],
      'fsd/no-public-api-sidestep': [
        'error',
        {
          alias: fsdAlias,
          layers: ['features', 'entities', 'modules'],
        },
      ],
      'fsd/no-cross-slice-dependency': 'error',
      'fsd/no-ui-in-business-logic': 'error',
      'fsd/no-global-store-imports': 'error',
      'fsd/ordered-imports': [
        'warn',
        {
          alias: fsdAlias,
          customOrder: ['app', 'pages', 'modules', 'features', 'entities', 'commons'],
        },
      ],
    },
  },

  // Commons layer — 내부 슬라이스 간 상대경로 import 허용
  {
    files: ['src/commons/**/*'],
    rules: {
      'fsd/no-relative-imports': 'off',
    },
  },

  // Custom rules
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // React
      'react/self-closing-comp': 'warn',
      'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
      'react/jsx-boolean-value': ['warn', 'never'],
      'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-nested-ternary': 'warn',
      eqeqeq: ['warn', 'always'],

      // Import ordering — FSD 레이어 간 순서는 fsd/ordered-imports가 담당
      // import/order는 그룹 분리 + newlines만 담당 (알파벳 정렬은 같은 그룹 내에서만)
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: 'react', group: 'builtin', position: 'before' },
            { pattern: 'react-dom/**', group: 'builtin', position: 'before' },
            { pattern: 'next', group: 'builtin', position: 'before' },
            { pattern: 'next/**', group: 'builtin', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
          'newlines-between': 'always',
          alphabetize: { order: 'ignore' },
        },
      ],
      'import/no-duplicates': 'warn',
    },
  },

  // Filename & folder naming convention
  {
    plugins: { 'check-file': checkFile },
    files: ['src/**/*'],
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.tsx': 'PASCAL_CASE',
          '**/*.ts': 'CAMEL_CASE',
        },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': ['error', { 'src/**': 'KEBAB_CASE' }],
    },
  },

  // Next.js convention files — 파일명 규칙 예외
  {
    files: [
      'src/**/page.tsx',
      'src/**/layout.tsx',
      'src/**/loading.tsx',
      'src/**/error.tsx',
      'src/**/not-found.tsx',
      'src/**/global-error.tsx',
      'src/**/default.tsx',
      'src/**/template.tsx',
      'src/**/route.ts',
      'src/**/proxy.ts',
      'src/**/middleware.ts',
      'src/**/opengraph-image.tsx',
      'src/**/icon.tsx',
      'src/**/sitemap.ts',
      'src/**/robots.ts',
      'src/**/manifest.ts',
    ],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },

  // Ignores
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
