import { test, expect } from "bun:test";
const { program } = require("../dist/index.js");

test("program has correct name and description", () => {
  expect(program.name()).toBe("ocsight");
  expect(program.description()).toBe(
    "OpenCode ecosystem observability platform - see everything happening in your OpenCode development",
  );
});

test("program has all required commands", () => {
  const commands = program.commands.map((cmd) => cmd.name());
  expect(commands).toContain("analyze");
  expect(commands).toContain("stats");
  expect(commands).toContain("export");
});

test("analyze command has correct configuration", () => {
  const analyzeCmd = program.commands.find((cmd) => cmd.name() === "analyze");
  expect(analyzeCmd).toBeDefined();
  expect(analyzeCmd.description()).toBe("Analyze OpenCode usage data");
  expect(analyzeCmd.options.length).toBeGreaterThan(0);
});

test("stats command has correct configuration", () => {
  const statsCmd = program.commands.find((cmd) => cmd.name() === "stats");
  expect(statsCmd).toBeDefined();
  expect(statsCmd.description()).toBe(
    "Show detailed statistics about OpenCode usage",
  );
  expect(statsCmd.options.length).toBeGreaterThan(0);
});

test("export command has correct configuration", () => {
  const exportCmd = program.commands.find((cmd) => cmd.name() === "export");
  expect(exportCmd).toBeDefined();
  expect(exportCmd.description()).toBe(
    "Export OpenCode usage data to CSV or JSON",
  );
  expect(exportCmd.options.length).toBeGreaterThan(0);
});

test("analyze command has required options", () => {
  const analyzeCmd = program.commands.find((cmd) => cmd.name() === "analyze");
  const optionNames = analyzeCmd.options.map((opt) => opt.flags);
  expect(optionNames).toContain("-d, --days <number>");
  expect(optionNames).toContain("--start <date>");
  expect(optionNames).toContain("--end <date>");
  expect(optionNames).toContain("--provider <provider>");
  expect(optionNames).toContain("--project <project>");
});

test("export command has format option", () => {
  const exportCmd = program.commands.find((cmd) => cmd.name() === "export");
  const formatOption = exportCmd.options.find((opt) =>
    opt.flags.includes("--format"),
  );
  expect(formatOption).toBeDefined();
  expect(formatOption?.flags).toBe("-f, --format <format>");
});

test("all commands have action handlers", () => {
  const analyzeCmd = program.commands.find((cmd) => cmd.name() === "analyze");
  const statsCmd = program.commands.find((cmd) => cmd.name() === "stats");
  const exportCmd = program.commands.find((cmd) => cmd.name() === "export");

  expect(analyzeCmd._actionHandler).toBeDefined();
  expect(statsCmd._actionHandler).toBeDefined();
  expect(exportCmd._actionHandler).toBeDefined();
});
