import { dirname } from 'path'
import { fileURLToPath } from 'url'
import nx from '@nx/eslint-plugin'
import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin'
import typescriptEslintParser from '@typescript-eslint/parser'

export default [
  ...nx.configs['flat/base'],
  { plugins: { '@typescript-eslint': typescriptEslintEslintPlugin } },
  {
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        ecmaVersion: 2018
      }
    }
  },
  ...nx.configs['flat/typescript'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {}
  },
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      'no-extra-semi': 'off'
    }
  },
  ...nx.configs['flat/angular'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'ocx-shell',
          style: 'camelCase'
        }
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'ocx-shell',
          style: 'kebab-case'
        }
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'none'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@angular-eslint/prefer-standalone': 'off',
      // Newly enabled by @angular-eslint v22 (not present in the old .eslintrc.json).
      // Held off to preserve the pre-upgrade baseline: the OnPush-by-default
      // migration (Phase A) keeps ChangeDetectionStrategy.Eager on the components
      // that previously opted out, which this rule would flag as an error.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      // Newly enabled by @typescript-eslint v8 (not present in the old .eslintrc.json).
      // Held off to preserve the pre-upgrade baseline.
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  },
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.html'],
    rules: {
      // Newly enabled by @angular-eslint v22 (not present in the old .eslintrc.json,
      // whose template override only extended plugin:@nx/angular-template with empty
      // rules). Held off to preserve the pre-upgrade baseline: the shell renders
      // PrimeNG <button pButton label="..."> elements whose visible content is set
      // via an attribute, which this rule would flag as "should have content".
      '@angular-eslint/template/elements-content': 'off'
    }
  },
  {
    ignores: [
      '.angular/**',
      '.nx/**',
      '.husky/**',
      '.github/**',
      '.scannerwork/**',
      'reports/**',
      'dist/**',
      'helm/**',
      'node_modules/**',
      'src/app/shared/generated/**',
      'src/assets/api/*',
      'src/**/*.ico',
      'src/**/*.svg',
      'src/scope-polyfill/*'
    ]
  }
]
