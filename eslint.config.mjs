import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'

export default ts.config(
  { ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  { files: ['**/*.ts', '**/*.vue'], rules: { 'no-undef': 'off' } },
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: ts.parser } } },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  { files: ['nuxt.config.ts'], languageOptions: { globals: { defineNuxtConfig: 'readonly' } } },
  { files: ['scripts/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly' } } },
)
