import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = "frontend/src/retained draft.ts";
const baseline = [
  'export const stagedValue = "baseline";',
  ...Array(20).fill("// Separate the staged edit from the retained draft."),
  'export const draftValue = "baseline";',
  "",
].join("\n");

function fixture(t) {
  const directory = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), "turva-tooling-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = join(directory, "repo");
  const bin = join(directory, "bin");
  for (const path of [".githooks", "frontend/src", "frontend/tests"]) {
    mkdirSync(join(root, path), { recursive: true });
  }
  mkdirSync(bin);
  // Never route fixture Git commands to the developer's index or repository.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
  );
  Object.assign(env, {
    PATH: `${bin}:${env.PATH}`,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
  });
  function run(command, args, cwd = root) {
    const result = spawnSync(command, args, { cwd, env, encoding: "utf8" });
    assert.ifError(result.error);
    return result;
  }
  function git(...args) {
    const result = run("git", args);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout;
  }
  function write(path, text) {
    writeFileSync(join(root, path), text);
  }
  symlinkSync(join(frontend, "node_modules"), join(root, "frontend/node_modules"), "dir");
  for (const name of [
    "package.json",
    "eslint.config.js",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
  ]) {
    copyFileSync(join(frontend, name), join(root, "frontend", name));
  }
  copyFileSync(join(frontend, "../.githooks/pre-commit"), join(root, ".githooks/pre-commit"));
  chmodSync(join(root, ".githooks/pre-commit"), 0o755);
  // The integration exercises the real Git hook, lint-staged, ESLint and
  // Prettier. Only the separately tested Python pre-commit dispatcher is a stub.
  writeFileSync(join(bin, "pre-commit"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
  write(".gitignore", "frontend/node_modules/\n*.tsbuildinfo\n");
  write(sourcePath, baseline);
  write("frontend/vite.config.ts", "export {};\n");
  git("init", "-q");
  git("config", "user.name", "Tooling Test");
  git("config", "user.email", "tooling@example.invalid");
  git("config", "commit.gpgsign", "false");
  git("add", ".");
  // Hook activation is deliberately after the fixture's baseline commit.
  git("commit", "-qm", "fixture baseline");
  git("config", "core.hooksPath", ".githooks");
  return { root, run, git, write };
}

for (const [path, code] of [
  [sourcePath, "export const applicationProbe: string = 7;\n"],
  ["frontend/vite.config.ts", "export const configurationProbe: string = 7;\n"],
]) {
  test(`the shared typecheck rejects a type error in ${path}`, (t) => {
    const f = fixture(t);
    f.write(path, code);
    const result = f.run(
      "npm",
      ["run", "typecheck", "--", "--pretty", "false"],
      join(f.root, "frontend"),
    );
    assert.notEqual(result.status, 0, "The checker silently ignored a referenced project");
    assert.match(result.stdout + result.stderr, /error TS2322/);
    assert.ok((result.stdout + result.stderr).includes(path.replace("frontend/", "")));
  });
}

test("a successful commit formats only the staged edit and retains an unstaged draft", async (t) => {
  const f = fixture(t);
  const staged = baseline.replace('stagedValue = "baseline";', "stagedValue='staged'");
  f.write(sourcePath, staged);
  f.git("add", sourcePath);
  f.write(sourcePath, staged.replace('draftValue = "baseline"', 'draftValue = "uncommitted"'));
  // A frontend commit must not route another surface's TypeScript through ESLint.
  f.write("outside.ts", "export const outside='leave as staged'\n");
  f.git("add", "outside.ts");
  const expected = await format(staged, { parser: "typescript" });
  f.git("commit", "-qm", "stage only the intended edit");
  assert.equal(f.git("show", `HEAD:${sourcePath}`), expected);
  assert.equal(
    readFileSync(join(f.root, sourcePath), "utf8"),
    expected.replace('draftValue = "baseline"', 'draftValue = "uncommitted"'),
  );
  assert.equal(f.git("show", "HEAD:outside.ts"), "export const outside='leave as staged'\n");
  assert.equal(f.git("diff", "--cached"), "");
  assert.equal(f.git("stash", "list"), "");
});

test("a failed lint-staged commit restores the exact index, draft and existing stash", (t) => {
  const f = fixture(t);
  f.write(sourcePath, baseline.replace("baseline", "separate stash"));
  f.git("stash", "push", "-qm", "unrelated saved draft");
  const stash = f.git("stash", "list", "--format=%H");
  const staged = baseline.replace('stagedValue = "baseline";', "stagedValue: any = 7;");
  f.write(sourcePath, staged);
  f.git("add", sourcePath);
  f.write(sourcePath, staged.replace('draftValue = "baseline"', 'draftValue = "uncommitted"'));
  const head = f.git("rev-parse", "HEAD");
  const index = f.git("diff", "--cached", "--binary");
  const draft = f.git("diff", "--binary");
  const result = f.run("git", ["commit", "-qm", "must not commit invalid staged code"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /no-explicit-any/);
  assert.equal(f.git("rev-parse", "HEAD"), head);
  assert.equal(f.git("diff", "--cached", "--binary"), index);
  assert.equal(f.git("diff", "--binary"), draft);
  assert.equal(f.git("stash", "list", "--format=%H"), stash);
});
