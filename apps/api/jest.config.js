{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testEnvironment": "node",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": [
    "**/*.(t|j)s",
    "!**/main.ts",
    "!**/node_modules/**"
  ],
  "coverageDirectory": "../coverage"
}