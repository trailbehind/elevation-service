import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {varsIgnorePattern: '^_', argsIgnorePattern: '^_'},
            ],
        },
    },
    {
        files: ['tests/**'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
);
