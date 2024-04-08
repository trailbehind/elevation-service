import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
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
        files: ['__tests__/**'],
        ...jest.configs['flat/recommended'],
        ...jest.configs['flat/style'],
        rules: {
            ...jest.configs['flat/recommended'].rules,
            ...jest.configs['flat/style'].rules,
            '@typescript-eslint/no-var-requires': 'off',
        },
        languageOptions: {
            sourceType: 'commonjs',
            globals: {
                ...globals.jest,
                ...globals.node,
            },
        },
    },
);
