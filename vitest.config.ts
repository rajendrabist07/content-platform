import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        env: {
            NODE_ENV: 'test',
        },
        setupFiles: ['./tests/setup.ts'],
    },
});