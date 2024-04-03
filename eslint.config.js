import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {...globals.node},
        },
        linterOptions: {reportUnusedDisableDirectives: 'error'},
        rules: {
            'no-unused-vars': ['error', {varsIgnorePattern: '^_', argsIgnorePattern: '^_'}],
        },
    },
    {
        files: ['**/*.test.js'],
        languageOptions: {globals: {...globals.jest}},
        rules: {
            'no-unused-vars': ['error', {varsIgnorePattern: '^_', argsIgnorePattern: '^_'}],
        },
    },
];
