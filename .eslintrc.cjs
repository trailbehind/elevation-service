module.exports = {
    root: true,

    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier',
    ],

    reportUnusedDisableDirectives: true,

    plugins: ['@typescript-eslint/eslint-plugin'],

    overrides: [
        {
            files: ['**/__tests__/**/*.[jt]s', '**/?(*.)+(spec|test).[jt]s'],
            plugins: ['jest', 'jest-dom', 'testing-library'],
            env: {'jest/globals': true},
            extends: ['plugin:jest/recommended'],
            rules: {
                '@typescript-eslint/no-floating-promises': 'off',
            },
        },
    ],

    parser: '@typescript-eslint/parser',

    parserOptions: {
        project: ['./tsconfig.json'],
        sourceType: 'module',
    },

    env: {
        node: true,
        es2022: true,
    },

    settings: {
        jest: {version: require('jest/package.json').version},
    },

    rules: {
        '@typescript-eslint/no-unused-vars': [
            'error',
            {varsIgnorePattern: '^_', argsIgnorePattern: '^_'},
        ],
    },

    ignorePatterns: ['.eslintrc.cjs', 'prettier.config.js'],
};
