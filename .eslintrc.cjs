module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // 关闭“禁止使用 any 类型”的规则
    '@typescript-eslint/no-explicit-any': 'off',
    // 将“禁止未使用的变量”的规则，从“报错”降级为“警告”
    '@typescript-eslint/no-unused-vars': 'warn',
  },
}
