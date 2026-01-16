export default defineConfig({
  test: {
    setupFiles: ["./test-setup.js", "./vitest.setup.mjs"],
    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    environment: "jsdom",
    globals: true,
  },
});
