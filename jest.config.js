export default {
 preset: "ts-jest/presets/default-esm",
 testEnvironment: "node",
 roots: ["<rootDir>/tests"],
 testMatch: ["**/*.test.ts"],
 transform: {
  "^.+\\.ts$": ["ts-jest", { useESM: true }],
 },
 moduleNameMapping: {
  "^@/(.*)$": "<rootDir>/client/src/$1",
  "^@shared/(.*)$": "<rootDir>/shared/$1",
 },
 setupFilesAfterEnv: [],
 testTimeout: 30000,
 verbose: true,
 collectCoverage: true,
 coverageDirectory: "coverage",
 coverageReporters: ["text", "lcov", "html"],
 collectCoverageFrom: ["server/**/*.ts", "!server/**/*.test.ts", "!server/vite.ts", "!server/index.ts"],
 coverageThreshold: {
  global: {
   branches: 70,
   functions: 70,
   lines: 70,
   statements: 70,
  },
 },
};
