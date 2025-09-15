package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]
	args := os.Args[2:]

	switch command {
	case "analyze":
		runAnalyze(args)
	case "stats":
		runStats(args)
	case "export":
		runExport(args)
	case "--help", "-h":
		printUsage()
	case "--version", "-v":
		printVersion()
	default:
		fmt.Printf("Unknown command: %s\n\n", command)
		printUsage()
		os.Exit(1)
	}
}

func runAnalyze(args []string) {
	flags := flag.NewFlagSet("analyze", flag.ExitOnError)
	days := flags.Int("days", 0, "Filter to last N days")
	start := flags.String("start", "", "Start date (YYYY-MM-DD)")
	end := flags.String("end", "", "End date (YYYY-MM-DD)")
	provider := flags.String("provider", "", "Filter by provider (anthropic, openai, etc.)")
	project := flags.String("project", "", "Filter by project name")
	excludeProject := flags.String("exclude-project", "", "Exclude project name")

	flags.Parse(args)

	nodeArgs := buildNodeArgs("analyze", map[string]any{
		"days":            *days,
		"start":           *start,
		"end":             *end,
		"provider":        *provider,
		"project":         *project,
		"exclude-project": *excludeProject,
	})

	runNodeCommand(nodeArgs)
}

func runStats(args []string) {
	flags := flag.NewFlagSet("stats", flag.ExitOnError)
	days := flags.Int("days", 0, "Filter to last N days")
	start := flags.String("start", "", "Start date (YYYY-MM-DD)")
	end := flags.String("end", "", "End date (YYYY-MM-DD)")
	provider := flags.String("provider", "", "Filter by provider (anthropic, openai, etc.)")
	project := flags.String("project", "", "Filter by project name")
	excludeProject := flags.String("exclude-project", "", "Exclude project name")

	flags.Parse(args)

	nodeArgs := buildNodeArgs("stats", map[string]any{
		"days":            *days,
		"start":           *start,
		"end":             *end,
		"provider":        *provider,
		"project":         *project,
		"exclude-project": *excludeProject,
	})

	runNodeCommand(nodeArgs)
}

func runExport(args []string) {
	flags := flag.NewFlagSet("export", flag.ExitOnError)
	path := flags.String("path", "", "Custom path to OpenCode data directory")
	days := flags.Int("days", 0, "Include data from last N days")
	start := flags.String("start", "", "Start date (YYYY-MM-DD)")
	end := flags.String("end", "", "End date (YYYY-MM-DD)")
	provider := flags.String("provider", "", "Filter by provider")
	project := flags.String("project", "", "Include only this project")
	excludeProject := flags.String("exclude-project", "", "Exclude this project")
	format := flags.String("format", "csv", "Export format (csv|json|markdown)")
	output := flags.String("output", "", "Output file path")

	flags.Parse(args)

	nodeArgs := buildNodeArgs("export", map[string]any{
		"path":            *path,
		"days":            *days,
		"start":           *start,
		"end":             *end,
		"provider":        *provider,
		"project":         *project,
		"exclude-project": *excludeProject,
		"format":          *format,
		"output":          *output,
	})

	runNodeCommand(nodeArgs)
}

func buildNodeArgs(command string, options map[string]any) []string {
	args := []string{getScriptPath(), command}

	for key, value := range options {
		switch v := value.(type) {
		case string:
			if v != "" {
				args = append(args, fmt.Sprintf("--%s", key), v)
			}
		case int:
			if v != 0 {
				args = append(args, fmt.Sprintf("--%s", key), fmt.Sprintf("%d", v))
			}
		}
	}

	return args
}

func runNodeCommand(args []string) {
	cmd := exec.Command("node", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	err := cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		fmt.Fprintf(os.Stderr, "Failed to execute command: %v\n", err)
		os.Exit(1)
	}
}

func getScriptPath() string {
	execPath, err := os.Executable()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get executable path: %v\n", err)
		os.Exit(1)
	}

	// Try multiple paths for JavaScript entry point
	paths := []string{
		filepath.Join(filepath.Dir(execPath), "lib", "index.js"),
		filepath.Join(filepath.Dir(execPath), "src", "index.js"),
		filepath.Join(filepath.Dir(execPath), "..", "lib", "index.js"),
		filepath.Join(filepath.Dir(execPath), "..", "src", "index.js"),
		filepath.Join(filepath.Dir(execPath), "index.js"),
	}

	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	// If no JavaScript file found, try to find any .js file
	jsPaths := []string{
		filepath.Join(filepath.Dir(execPath), "lib"),
		filepath.Join(filepath.Dir(execPath), "..", "lib"),
		filepath.Join(filepath.Dir(execPath)),
	}

	for _, dir := range jsPaths {
		if files, err := os.ReadDir(dir); err == nil {
			for _, file := range files {
				if !file.IsDir() && strings.HasSuffix(file.Name(), ".js") {
					return filepath.Join(dir, file.Name())
				}
			}
		}
	}

	fmt.Fprintf(os.Stderr, "Could not find JavaScript entry point\n")
	os.Exit(1)
	return ""
}

func printUsage() {
	fmt.Printf(`OpenCode ecosystem observability platform - see everything happening in your OpenCode development

USAGE:
    ocsight [COMMAND] [OPTIONS]

COMMANDS:
    analyze     Analyze OpenCode usage data
    stats       Show detailed statistics about OpenCode usage  
    export      Export OpenCode usage data to CSV or JSON

OPTIONS:
    -h, --help       Print help information
    -v, --version    Print version information

Use 'ocsight [COMMAND] --help' for more information about a command.
`)
}

func printVersion() {
	fmt.Printf("ocsight %s (%s/%s)\n", getVersion(), runtime.GOOS, runtime.GOARCH)
}

var Version string = "dev"

func getVersion() string {
	return Version
}
