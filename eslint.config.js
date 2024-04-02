import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
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
