# Benchmaker

A modular, visual LLM benchmarking desktop application for scientifically comparing multiple Large Language Models under identical conditions.

## Overview

Benchmaker enables AI researchers, prompt engineers, and technical teams to:

- **Define standardized test suites** with system prompts and test cases
- **Select and compare multiple LLMs** via the OpenRouter API
- **Execute benchmarks in parallel** across all selected models
- **Score results** using objective rules and/or LLM judge models
- **Persist and compare results** for regression testing and historical analysis

## Features

- **Multi-model parallel execution** - Run the same prompts against multiple LLMs simultaneously
- **Real-time response streaming** - Watch responses as they're generated
- **Modular scoring system** - Exact match, regex, fuzzy matching, and LLM-as-judge scoring
- **SQLite persistence** - Local database for test suites and run history
- **Monaco editor integration** - Rich code editor for prompt authoring
- **Custom Tauri window** - Native desktop experience with custom title bar
- **Auto-updates** - Checks GitHub releases on startup and installs new versions
- **AI-assisted tooling** - Test case generation and prompt enhancement helpers
- **Dark/Light mode** - Theme support for comfortable usage

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite build system
- Tailwind CSS
- Zustand state management
- Radix UI primitives (custom-styled)
- Monaco Editor

**Backend:**
- Tauri (Rust)
- SQLite (rusqlite)
- Serde serialization

**External APIs:**
- OpenRouter (LLM access)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [pnpm](https://pnpm.io/) or npm
- An [OpenRouter API key](https://openrouter.ai/)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/benchmaker.git
   cd benchmaker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run tauri dev
   ```

4. **Build for production:**
   ```bash
   npm run tauri build
   ```

## Project Structure

```
benchmaker/
├── src/                          # React frontend
│   ├── components/
│   │   ├── arena/                # Test execution controls
│   │   ├── prompt-manager/       # Test suite creation
│   │   ├── results/              # Results and reporting
│   │   ├── data/                 # Data management
│   │   ├── settings/             # Settings UI
│   │   ├── layout/               # App layout components
│   │   └── ui/                   # Reusable UI primitives
│   ├── services/                 # Business logic
│   ├── stores/                   # Zustand state stores
│   ├── scoring/                  # Scoring implementations
│   ├── types/                    # TypeScript definitions
│   └── lib/                      # Utilities
├── src-tauri/                    # Rust backend
│   ├── src/main.rs               # Tauri app + SQLite
│   └── tauri.conf.json           # Tauri configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── PRD.md                        # Product requirements
```

## Usage

### 1. Configure API Key
Enter your OpenRouter API key in the Settings tab.

### 2. Create a Test Suite
- Navigate to the **Prompt Manager** tab
- Define a system prompt that applies to all test cases
- Add individual test cases with prompts and expected outputs
- Optionally configure scoring methods per test case

### 3. Select Models
- Go to the **Arena** tab
- Select one or more LLMs from the model list
- Configure inference parameters (temperature, top_p, max_tokens)
- Optionally select a judge model for LLM-based scoring

### 4. Run Benchmark
- Click **Run** to execute all test cases against selected models
- Watch real-time streaming responses
- View progress and status per model

### 5. Analyze Results
- Switch to the **Results** tab
- Compare responses side-by-side in the grid view
- Review aggregate scores and per-test breakdowns
- Results are automatically saved for future reference

### Updates
- The app checks for updates on startup.
- Click the version button in the header (e.g. `v0.0.6`) to view update status, release notes, or manually re-check.
- Updates are pulled from GitHub Releases and expect a `Benchmaker-Portable.exe` asset on the latest tag.

## Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only |
| `npm run build` | Build frontend for production |
| `npm run tauri dev` | Run full Tauri development build |
| `npm run tauri build` | Build production desktop app |

### Release Notes
- Version is sourced from `package.json` and `src-tauri/tauri.conf.json`.
- GitHub releases should be tagged as `vX.Y.Z` and include `Benchmaker-Portable.exe`.

### Architecture Notes

- **State Management:** All application state is managed through Zustand stores in `src/stores/`
- **Services:** API calls and business logic are encapsulated in `src/services/`
- **Scoring:** Pluggable scoring system in `src/scoring/` - add new scoring methods here
- **Types:** Centralized TypeScript types in `src/types/index.ts`
- **Database:** SQLite schema and migrations are in `src-tauri/src/main.rs`

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following the existing code style
4. **Test your changes** thoroughly
5. **Commit with clear messages:**
   ```bash
   git commit -m "Add: description of your feature"
   ```
6. **Push and create a Pull Request**

### Contribution Guidelines

- Follow existing TypeScript/React patterns in the codebase
- Keep components small and focused
- Add types for all new code
- Test changes with multiple models before submitting
- Update documentation for new features

### Areas Open for Contribution

- Additional scoring plugins (regex, numeric tolerance, etc.)
- Export functionality (JSON, CSV, PDF reports)
- UI/UX improvements
- Performance optimizations
- Documentation and examples
- Test coverage
- Accessibility improvements

## Roadmap

- [ ] Code execution sandbox scoring
- [ ] Cost-aware benchmarking (track API costs)
- [ ] Prompt diff/comparison tools
- [ ] Export to JSON/CSV
- [ ] Public shareable benchmark URLs
- [ ] CI-style automated regression runs
- [ ] Team workspaces and collaboration

## License

[MIT License](LICENSE)

## Acknowledgments

- [OpenRouter](https://openrouter.ai/) for unified LLM API access
- [Tauri](https://tauri.app/) for the desktop framework
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
