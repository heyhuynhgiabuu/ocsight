import { test, expect } from "bun:test";
import { initializeProgram } from "../dist/index.js";

test("program has correct name and description", async () => {
  const program = await initializeProgram();
  expect(program.name()).toBe("ocsight");
  expect(program.description()).toBe(
    "OpenCode ecosystem observability platform - see everything happening in your OpenCode development",
  );
});

test("program has all required commands", async () => {
  const program = await initializeProgram();
  const commands = program.commands.map((cmd) => cmd.name());
  expect(commands).toContain("summary");
  expect(commands).toContain("sessions");
  expect(commands).toContain("export");
  expect(commands).toContain("config");
  expect(commands).toContain("live");
  expect(commands).toContain("models");
  expect(commands).toContain("budget");
});

test("analyze command has correct configuration", async () => {
  const program = await initializeProgram();
  const analyzeCmd = program.commands.find((cmd) => cmd.name() === "analyze");
  expect(analyzeCmd.description()).toBe("Analyze OpenCode usage data");
  expect(analyzeCmd.options.length).toBeGreaterThan(0);
});

test("stats command has correct configuration", async () => {
  const program = await initializeProgram();
  const statsCmd = program.commands.find((cmd) => cmd.name() === "stats");
  expect(statsCmd.description()).toBe(
    "Display statistics about OpenCode usage",
  );
  expect(statsCmd.options.length).toBeGreaterThan(0);
});

test("export command has correct configuration", async () => {
  const program = await initializeProgram();
  const exportCmd = program.commands.find((cmd) => cmd.name() === "export");
  expect(exportCmd.description()).toBe(
    "Export OpenCode data to various formats",
  );
  expect(exportCmd.options.length).toBeGreaterThan(0);

  const formatOption = exportCmd.options.find(
    (opt) => opt.flags === "-f, --format <format>",
  );
  expect(formatOption).toBeDefined();
  expect(formatOption?.flags).toBe("-f, --format <format>");
});

test("analyze command has required options", async () => {
  const program = await initializeProgram();
  const analyzeCmd = program.commands.find((cmd) => cmd.name() === "analyze");
  const optionNames = analyzeCmd.options.map((opt) => opt.flags);

  expect(optionNames).toContain("--provider <provider>");
  expect(optionNames).toContain("--project <project>");
});

test("export command has format option", async () => {
  const program = await initializeProgram();
  const exportCmd = program.commands.find((cmd) => cmd.name() === "export");
  const formatOption = exportCmd.options.find(
    (opt) => opt.flags === "-f, --format <format>",
  );
  expect(formatOption).toBeDefined();
  expect(formatOption?.flags).toBe("-f, --format <format>");
});

test("all commands have action handlers", async () => {
  const program = await initializeProgram();
  const analyzeCmd = program.commands.find((cmd) => cmd.name() === "analyze");
  const statsCmd = program.commands.find((cmd) => cmd.name() === "stats");
  const exportCmd = program.commands.find((cmd) => cmd.name() === "export");

  expect(analyzeCmd._actionHandler).toBeDefined();
  expect(statsCmd._actionHandler).toBeDefined();
  expect(exportCmd._actionHandler).toBeDefined();
});
