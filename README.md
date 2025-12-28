# PR Review AI

LLM-Powered GitHub Pull Request Review Assistant - A production-grade tool that analyzes GitHub pull requests using AI and provides structured, actionable code reviews.

## 🎬 Demo

https://github.com/hamza7malik/pr-review-ai/assets/demo.mp4

> **Note**: If the video doesn't load above, you can [watch it here](./frontend/public/demo.mp4) or view it in the live application.

## 🚀 Overview

This application allows users to:

- Paste a public GitHub Pull Request URL
- Fetch the PR diff using the GitHub API
- Analyze the diff using an LLM (OpenAI GPT-4) acting as a senior code reviewer
- Display a structured, readable review with risk categorization

Built as a portfolio project demonstrating clean architecture, modern TypeScript practices, and full-stack development skills.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  (Vite + React + TypeScript + shadcn/ui + TailwindCSS)    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  UI Layer    │  │ React Query  │  │  Zustand Store  │  │
│  │ (Components) │  │  (API State) │  │  (Local State)  │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│            │               │                   │            │
│            └───────────────┴───────────────────┘            │
│                            │                                │
│                      [Axios Client]                         │
└────────────────────────────┼────────────────────────────────┘
                             │
                    HTTP POST /api/review
                             │
┌────────────────────────────┼────────────────────────────────┐
│                         Backend                             │
│        (Node.js + Express + TypeScript + Octokit)          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Controller  │→ │   Services   │→ │   External APIs │  │
│  │  (Routing)   │  │  (Business   │  │  - GitHub API   │  │
│  │              │  │    Logic)    │  │  - OpenAI/Gemini│  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│         │                  │                   │            │
│    [Validation]      [Processing]       [Integration]      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input**: User submits GitHub PR URL via frontend form
2. **Validation**: Zod schema validates URL format on both client and server
3. **PR Parsing**: Backend extracts owner, repo, and PR number
4. **GitHub API**: Fetch PR metadata and file diffs using Octokit
5. **Diff Processing**: Normalize and chunk diff data for LLM consumption
6. **Provider Selection**: Factory creates appropriate LLM provider (OpenAI or Gemini)
7. **LLM Analysis**: Send diff to selected provider with structured prompt
8. **Response Parsing**: Parse JSON response from LLM
9. **UI Rendering**: Display categorized review results

## 📦 Tech Stack

### Frontend

- **Vite**: Fast build tool and dev server
- **React 18**: UI library with hooks
- **TypeScript**: Type safety throughout
- **shadcn/ui**: High-quality Radix + Tailwind components
- **TailwindCSS**: Utility-first styling
- **Zustand**: Lightweight state management
- **React Query (TanStack Query)**: Server state management
- **Axios**: HTTP client
- **Zod**: Runtime schema validation

### Backend

- **Node.js + TypeScript**: Runtime and language
- **Express**: Web framework
- **Octokit**: Official GitHub REST API client
- **LLM Providers**:
  - **OpenAI SDK**: GPT-4 Turbo integration
  - **Google Generative AI**: Gemini 1.5 Pro integration
- **Factory Pattern**: Extensible provider abstraction
- **Zod**: Request validation
- **dotenv**: Environment configuration
- **ESLint + Prettier**: Code quality

## 🎯 Prompt Design

The LLM prompt is carefully engineered for high-quality code reviews:

### System Prompt

```
You are a senior software engineer performing a pull request review.

Rules:
- Only comment on what is visible in the diff.
- Do NOT assume missing context.
- If something is unclear, ask a question instead of guessing.
- Be strict, constructive, and practical.
- Focus on bugs, edge cases, performance, security, and maintainability.
```

### Response Structure

The LLM returns structured JSON with six categories:

- **Summary**: High-level overview of changes
- **High Risk Issues**: Critical bugs, security vulnerabilities
- **Medium Risk Issues**: Logic errors, potential bugs
- **Low Risk / Style Issues**: Code style, minor improvements
- **Suggestions**: Best practices, optimizations
- **Questions for Author**: Clarifications needed

### Why This Design?

1. **Strict Rules**: Prevents hallucination by limiting analysis to visible code
2. **Risk Categorization**: Helps prioritize reviewer attention
3. **JSON Format**: Ensures structured, parseable output
4. **Constructive Tone**: Balances strictness with helpfulness
5. **Question Section**: Acknowledges uncertainty rather than guessing

## 📂 Project Structure

```
pr-review-ai/
├── backend/
│   ├── src/
│   │   ├── app.ts                    # Express app setup
│   │   ├── server.ts                 # Server entry point
│   │   ├── config/
│   │   │   └── env.ts                # Environment validation
│   │   ├── routes/
│   │   │   └── review.route.ts       # API routes
│   │   ├── controllers/
│   │   │   └── review.controller.ts  # Request handlers
│   │   ├── services/
│   │   │   ├── llm/
│   │   │   │   ├── base.ts           # LLM provider interface
│   │   │   │   ├── openai.provider.ts # OpenAI implementation
│   │   │   │   ├── gemini.provider.ts # Gemini implementation
│   │   │   │   ├── factory.ts        # Provider factory
│   │   │   │   └── index.ts          # Exports
│   │   │   ├── github.service.ts     # GitHub API integration
│   │   │   ├── llm.service.ts        # LLM service layer
│   │   │   └── review.service.ts     # Core business logic
│   │   ├── utils/
│   │   │   ├── parsePrUrl.ts         # URL parsing utility
│   │   │   ├── chunkDiff.ts          # Diff processing
│   │   │   └── logger.ts             # Logging utility
│   │   ├── schemas/
│   │   │   └── review.schema.ts      # Zod validation schemas
│   │   └── types/
│   │       └── review.ts             # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── App.tsx               # Main application
    │   │   └── providers/
    │   │       ├── query-client.tsx  # React Query setup
    │   │       └── index.tsx         # Provider composition
    │   ├── components/
    │   │   ├── review/
    │   │   │   ├── ReviewResult.tsx  # Main review display
    │   │   │   ├── ReviewSection.tsx # Section wrapper
    │   │   │   └── IssueList.tsx     # Issue rendering
    │   │   └── ui/                   # shadcn components
    │   ├── features/
    │   │   └── review/
    │   │       ├── api.ts            # API client functions
    │   │       ├── schema.ts         # Client validation
    │   │       ├── store.ts          # Zustand store
    │   │       └── types.ts          # TypeScript types
    │   ├── lib/
    │   │   ├── axios.ts              # Axios configuration
    │   │   └── utils.ts              # Utility functions
    │   ├── styles/
    │   │   └── globals.css           # Global styles
    │   └── main.tsx                  # Application entry
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── .env.example
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and yarn
- LLM Provider API Key (choose one):
  - OpenAI API key (for GPT-4)
  - Google AI API key (for Gemini)
- GitHub Personal Access Token (optional, increases rate limits)

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
yarn install
```

3. Create `.env` file:

```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:

**Option A: Using OpenAI (GPT-4)**

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key-here
GITHUB_TOKEN=ghp_your-github-token-here  # Optional but recommended
PORT=4000
NODE_ENV=development
```

**Option B: Using Google Gemini**

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key-here
GITHUB_TOKEN=ghp_your-github-token-here  # Optional but recommended
PORT=4000
NODE_ENV=development
```

> **Note**: The `LLM_PROVIDER` field determines which AI service to use. Set it to either `openai` or `gemini`, and provide the corresponding API key.

5. Start development server:

```bash
yarn dev
```

Backend will run at `http://localhost:4000`

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
yarn install
```

3. Create `.env` file:

```bash
cp .env.example .env
```

4. Configure environment (defaults work for local development):

```env
VITE_API_BASE_URL=http://localhost:4000
```

5. Start development server:

```bash
yarn dev
```

Frontend will run at `http://localhost:5173`

### Full Stack Development

Run both servers concurrently in separate terminals for full-stack development.

## 🎮 Usage

1. Open the frontend in your browser: `http://localhost:5173`
2. Paste a public GitHub PR URL (e.g., `https://github.com/facebook/react/pull/28000`)
3. Click "Review PR"
4. Wait 10-30 seconds for analysis
5. View structured review with categorized findings

### Example PR to Test

```
https://github.com/vercel/next.js/pull/59000
https://github.com/microsoft/vscode/pull/200000
https://github.com/facebook/react/pull/28000
```

Note: PR must be from a public repository.

## ⚙️ Environment Variables

### Backend

| Variable         | Description                   | Required       |
| ---------------- | ----------------------------- | -------------- |
| `OPENAI_API_KEY` | OpenAI API key for LLM access | ✅ Yes         |
| `GITHUB_TOKEN`   | GitHub personal access token  | ⚠️ Recommended |
| `PORT`           | Server port (default: 4000)   | ❌ No          |
| `NODE_ENV`       | Environment mode              | ❌ No          |

### Frontend

| Variable            | Description     | Required |
| ------------------- | --------------- | -------- |
| `VITE_API_BASE_URL` | Backend API URL | ✅ Yes   |

## 🚧 Error Handling

The application handles various error scenarios gracefully:

- **Invalid URL Format**: Client-side Zod validation
- **Private Repositories**: GitHub API returns 404
- **Rate Limiting**: GitHub/OpenAI API rate limits
- **Network Errors**: Axios interceptors with user-friendly messages
- **LLM Failures**: Fallback error responses
- **Large Diffs**: Automatic truncation at 8000 characters

All errors display user-friendly messages without exposing stack traces.

## 🎨 Code Quality Features

- **Strict TypeScript**: No `any` types, full type safety
- **Functional Architecture**: Pure functions, clear separation of concerns
- **No Logic in JSX**: Components only handle rendering
- **Validation Everywhere**: Zod schemas on client and server
- **ESLint + Prettier**: Consistent code formatting
- **Clear Naming**: No abbreviations, self-documenting code
- **Small Functions**: Most functions under 50 lines
- **Error Boundaries**: Graceful error handling throughout

## 🔄 Tradeoffs & Limitations

### Current Limitations

1. **Public PRs Only**: Cannot access private repositories without OAuth
2. **Diff Size**: Large PRs truncated at 8000 chars to manage token limits
3. **Single File Processing**: All files analyzed together (not individually)
4. **No Persistence**: Reviews not saved (stateless design)
5. **Rate Limits**: Subject to GitHub (5000/hour) and OpenAI limits

### Design Decisions

- **No Database**: Keeps architecture simple, suitable for demo/portfolio
- **Synchronous Processing**: Simpler than async job queues for MVP
- **Client-Side State**: Zustand sufficient for single-page app
- **Monorepo Structure**: Separate backend/frontend for clarity

## 🚀 Future Improvements

### Short Term

- [ ] Add loading skeleton UI
- [ ] Support PR comparison (base vs head)
- [ ] Add "copy review" functionality
- [ ] Dark mode toggle
- [ ] Review history (local storage)

### Medium Term

- [ ] OAuth for private repositories
- [ ] Batch file analysis for large PRs
- [ ] Configurable LLM parameters (temperature, model)
- [ ] Export review as Markdown/PDF
- [ ] Multiple LLM provider support (Anthropic, etc.)

### Long Term

- [ ] User authentication and saved reviews
- [ ] GitHub App integration (webhook-based)
- [ ] Real-time streaming responses
- [ ] Custom review templates
- [ ] Team analytics dashboard

## 📊 Example Output

```json
{
  "summary": "This PR introduces a new authentication system using JWT tokens...",
  "high_risk_issues": [
    "Line 42: JWT secret is hardcoded. Use environment variables.",
    "Line 78: SQL query vulnerable to injection. Use parameterized queries."
  ],
  "medium_risk_issues": [
    "Line 120: Error handling missing for async operation."
  ],
  "low_risk_or_style_issues": ["Line 15: Consider using const instead of let."],
  "suggestions": ["Consider adding unit tests for the new auth middleware."],
  "questions_for_author": [
    "What is the expected behavior when the token expires?"
  ]
}
```

## 🧪 Testing

### Manual Testing

1. Test with various PR sizes (small, medium, large)
2. Test with different programming languages
3. Test error scenarios (invalid URL, private repo, rate limits)
4. Test edge cases (empty PR, binary files, etc.)

### Automated Testing (Future)

- Unit tests for utils and services
- Integration tests for API endpoints
- E2E tests for critical user flows

## 📝 License

MIT License - feel free to use this project for learning or portfolio purposes.

## 🤝 Contributing

This is a portfolio project, but feedback and suggestions are welcome! Open an issue or submit a PR.

## 👨‍💻 Author

Built as a demonstration of production-grade full-stack development skills.

---

**Note**: This project is designed for educational and portfolio purposes. For production use, consider adding authentication, database persistence, and more robust error handling.
