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

test("summary command has correct configuration", async () => {
  const program = await initializeProgram();
  const summaryCmd = program.commands.find((cmd) => cmd.name() === "summary");
  expect(summaryCmd).toBeDefined();
  expect(summaryCmd.description()).toBe("Unified usage summary and analysis");
  expect(summaryCmd.options.length).toBeGreaterThan(0);
});

test("sessions command has correct configuration", async () => {
  const program = await initializeProgram();
  const sessionsCmd = program.commands.find((cmd) => cmd.name() === "sessions");
  expect(sessionsCmd).toBeDefined();
  expect(sessionsCmd.description()).toBe("Session management and exploration");
});

test("export command has correct configuration", async () => {
  const program = await initializeProgram();
  const exportCmd = program.commands.find((cmd) => cmd.name() === "export");
  expect(exportCmd.description()).toBe("Export OpenCode usage data");
  expect(exportCmd.options.length).toBeGreaterThan(0);

  const formatOption = exportCmd.options.find(
    (opt) => opt.flags === "-f, --format <format>",
  );
  expect(formatOption).toBeDefined();
  expect(formatOption?.flags).toBe("-f, --format <format>");
});

test("costs command has correct configuration", async () => {
  const program = await initializeProgram();
  const costsCmd = program.commands.find((cmd) => cmd.name() === "costs");
  expect(costsCmd).toBeDefined();
  expect(costsCmd.description()).toBe("Cost analysis and spending tracking");
  expect(costsCmd.options.length).toBeGreaterThan(0);
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
  const summaryCmd = program.commands.find((cmd) => cmd.name() === "summary");
  const sessionsCmd = program.commands.find((cmd) => cmd.name() === "sessions");
  const exportCmd = program.commands.find((cmd) => cmd.name() === "export");

  expect(summaryCmd._actionHandler).toBeDefined();
  expect(sessionsCmd._actionHandler).toBeDefined();
  expect(exportCmd._actionHandler).toBeDefined();
});
