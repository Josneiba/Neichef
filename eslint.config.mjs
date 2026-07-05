import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: ['node_modules/**', '.next/**', 'prisma/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {},
  },
]
