import { describe, expect, test } from "bun:test";
import { renderTable, renderKV, section } from "../src/lib/table.js";

describe("Table Rendering", () => {
  test("renderTable formats data correctly", () => {
    const result = renderTable({
      head: ["Name", "Count", "Percentage"],
      rows: [
        ["Tool A", 25, "45.5%"],
        ["Tool B", 15, "27.3%"],
      ],
    });

    expect(result).toContain("Name");
    expect(result).toContain("Tool A");
    expect(result).toContain("┌");
    expect(result).toContain("─");
    expect(result).toContain("│");
  });

  test("renderKV formats key-value pairs", () => {
    const result = renderKV([
      ["Sessions", 100],
      ["Cost", "$50.00"],
    ]);

    expect(result).toContain("Metric");
    expect(result).toContain("Value");
    expect(result).toContain("Sessions");
    expect(result).toContain("100");
  });

  test("section adds title and formatting", () => {
    const table = renderKV([["Key", "Value"]]);
    const result = section("Test Section:", table);

    expect(result).toContain("Test Section:");
    expect(result).toMatch(/\n.*Test Section:.*\n/);
  });

  test("numeric alignment detection", () => {
    const result = renderTable({
      head: ["Tool", "Count", "Rate"],
      rows: [
        ["bash", 25, "95%"],
        ["edit", 20, "98%"],
      ],
    });

    // Should have proper table structure
    expect(result).toContain("Tool");
    expect(result).toContain("bash");
    expect(result).toContain("25");
  });
});
