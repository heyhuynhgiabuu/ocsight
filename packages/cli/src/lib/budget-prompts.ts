import * as readline from "readline";
import chalk from "chalk";
import { ProviderInfo } from "./models-db.js";

const CLEAR_LINE = "\x1b[2K";
const CURSOR_UP = "\x1b[1A";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

interface ProviderOption {
  id: string;
  name: string;
  recommended?: boolean;
}

export async function providerSelectPrompt(
  providers: ProviderInfo[],
): Promise<string | null> {
  return new Promise((resolve) => {
    const options: ProviderOption[] = providers.map((p) => ({
      id: p.id,
      name: p.name,
      recommended: p.id === "anthropic",
    }));

    let searchQuery = "";
    let selectedIndex = 0;
    let filteredOptions = [...options];
    let lastRenderedLines = 0;

    const rl = readline.createInterface({
      input: process.stdin,
      terminal: true,
    });

    const filterOptions = (query: string) => {
      const lowerQuery = query.toLowerCase();
      return options.filter(
        (opt) =>
          opt.name.toLowerCase().includes(lowerQuery) ||
          opt.id.toLowerCase().includes(lowerQuery),
      );
    };

    const render = () => {
      let lineCount = 0;

      process.stdout.write(
        chalk.white("  Search: ") +
          chalk.blueBright(searchQuery) +
          chalk.dim("█\n"),
      );
      lineCount++;

      if (filteredOptions.length === 0) {
        process.stdout.write(chalk.dim("  No providers found\n"));
        lineCount++;
      } else if (filteredOptions.length <= 10) {
        filteredOptions.forEach((opt, index) => {
          const isSelected = index === selectedIndex;
          const bullet = isSelected ? chalk.cyan("●") : chalk.dim("○");
          const name = isSelected
            ? chalk.white(opt.name)
            : chalk.gray(opt.name);
          const tag = opt.recommended
            ? chalk.dim(" (") + chalk.yellow("recommended") + chalk.dim(")")
            : "";

          process.stdout.write(`  ${bullet} ${name}${tag}\n`);
          lineCount++;
        });
      } else {
        const maxVisible = 10;
        let startIndex = 0;
        let endIndex = maxVisible;

        if (selectedIndex >= maxVisible - 2) {
          startIndex = Math.min(
            selectedIndex - maxVisible + 3,
            filteredOptions.length - maxVisible,
          );
          endIndex = startIndex + maxVisible;
        }

        if (startIndex > 0) {
          process.stdout.write(chalk.dim("  ...\n"));
          lineCount++;
        }

        const visibleOptions = filteredOptions.slice(startIndex, endIndex);
        visibleOptions.forEach((opt, relativeIndex) => {
          const actualIndex = startIndex + relativeIndex;
          const isSelected = actualIndex === selectedIndex;
          const bullet = isSelected ? chalk.cyan("●") : chalk.dim("○");
          const name = isSelected
            ? chalk.white(opt.name)
            : chalk.gray(opt.name);
          const tag = opt.recommended
            ? chalk.dim(" (") + chalk.yellow("recommended") + chalk.dim(")")
            : "";

          process.stdout.write(`  ${bullet} ${name}${tag}\n`);
          lineCount++;
        });

        if (endIndex < filteredOptions.length) {
          process.stdout.write(chalk.dim("  ...\n"));
          lineCount++;
        }
      }

      process.stdout.write(
        "\n" +
          chalk.dim("  ↑/↓ to select • ") +
          chalk.dim("Enter: confirm • ") +
          chalk.dim("Type: to search") +
          "\n",
      );
      lineCount += 2;

      lastRenderedLines = lineCount;
    };

    const clearScreen = () => {
      for (let i = 0; i < lastRenderedLines; i++) {
        process.stdout.write(CURSOR_UP + CLEAR_LINE);
      }
    };

    process.stdout.write(HIDE_CURSOR);
    render();

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const onKeypress = (str: string, key: readline.Key) => {
      if (!key || !key.name) {
        return;
      }

      if (key.name === "return") {
        cleanup();
        if (filteredOptions.length > 0) {
          resolve(filteredOptions[selectedIndex].id);
        } else {
          resolve(null);
        }
      } else if (key.name === "up") {
        if (selectedIndex > 0) {
          selectedIndex = selectedIndex - 1;
          clearScreen();
          render();
        }
      } else if (key.name === "down") {
        if (selectedIndex < filteredOptions.length - 1) {
          selectedIndex = selectedIndex + 1;
          clearScreen();
          render();
        }
      } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        cleanup();
        resolve(null);
      } else if (key.name === "backspace") {
        if (searchQuery.length > 0) {
          searchQuery = searchQuery.slice(0, -1);
          filteredOptions = filterOptions(searchQuery);
          selectedIndex = Math.min(
            selectedIndex,
            Math.max(0, filteredOptions.length - 1),
          );
          clearScreen();
          render();
        }
      } else if (
        str &&
        !key.ctrl &&
        !key.meta &&
        str.length === 1 &&
        str.charCodeAt(0) >= 32
      ) {
        searchQuery += str;
        filteredOptions = filterOptions(searchQuery);
        selectedIndex = 0;
        clearScreen();
        render();
      }
    };

    const cleanup = () => {
      process.stdin.off("keypress", onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      rl.close();
      process.stdout.write(SHOW_CURSOR);
      clearScreen();
    };

    process.stdin.on("keypress", onKeypress);
  });
}

export async function budgetInputPrompt(): Promise<number | null> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(
      chalk.white("  Monthly limit (USD): ") + chalk.cyan("$"),
    );

    rl.on("line", (input) => {
      rl.close();
      const amount = parseFloat(input);

      if (isNaN(amount) || amount <= 0) {
        console.log(chalk.red("\n  Invalid amount"));
        resolve(null);
      } else {
        resolve(amount);
      }
    });

    rl.on("close", () => {
      if (!rl.terminal) {
        resolve(null);
      }
    });
  });
}

export async function confirmPrompt(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(chalk.white(`  ${message} `) + chalk.dim("(y/N): "));

    rl.on("line", (input) => {
      rl.close();
      const answer = input.trim().toLowerCase();
      resolve(answer === "y" || answer === "yes");
    });

    rl.on("close", () => {
      if (!rl.terminal) {
        resolve(false);
      }
    });
  });
}
