# Hyperkit - AI Workflow Automation Platform

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16.0.5-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19.2.0-blue?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-blue?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS"/>
</div>

## Overview

**Hyperkit** is an AI-native workflow automation platform. Just describe your logic in natural language and AI will automatically build and execute complex workflows for you.

### Core Features

- **AI Architect**: Describe your logic in plain English; AI creates your workflow with DAG, error handling, and optimization
- **MCP Native**: Securely connect local servers, databases, and internal tools via Model Context Protocol (MCP)
- **Real-time Chat**: Chat with AI agents with streaming responses
- **Marketplace**: Discover and install pre-built workflows and tools from the community
- **Dashboard**: Monitor your agents' performance, cost, and execution logs

## Tech Stack

- **Next.js 16.0.5** — React framework with App Router
- **React 19.2.0** + **TypeScript 5.9.3**
- **Zustand** — State management
- **TanStack Query** — Server state & caching
- **Axios** — HTTP client
- **Tailwind CSS 4.0** — Styling
- **Clerk** — Authentication

## Project Structure

```
hyperkit-fe/
├── app/                          # Next.js App Router
│   ├── (landing-page)/          # Public landing page
│   ├── (protected)/             # Protected routes
│   │   ├── dashboard/           # Workflow management
│   │   ├── marketplace/         # Browse workflows & tools
│   │   └── agent/               # Chat with AI agent
│   └── auth/                    # Login, Register, Verify
│
├── components/
│   ├── chat/                    # Chat interface components
│   ├── dashboard/               # Dashboard & workflow management
│   ├── marketplace/             # Marketplace components
│   ├── layout/                  # Navbar, navigation
│   └── ui/                      # Reusable UI components
│
├── service/                     # API Services
│   ├── chatApiService.ts        # Chat & conversations API
│   ├── mcpService.ts            # MCP tools management
│   ├── knowledgeService.ts      # Knowledge base API
│   └── buildService.ts          # Workflow build & execution
│
├── types/                       # TypeScript type definitions
├── provider/                    # React Context Providers
├── store/                       # Zustand state stores
└── lib/                         # Utility functions
```

## Main Flows

### 1. Authentication Flow

```
Landing Page → Click "Launch App" → Clerk Login → Dashboard
```

### 2. Create Workflow

```
Dashboard → Click "Create" Button →
├─ Step 1: Choose template or start from scratch
├─ Step 2: Configure parameters & add MCP tools
└─ Step 3: Review & deploy → Redirect to Agent Chat
```

### 3. Chat with AI Agent

```
Agent Page → User enters prompt →
API: chatApiService.sendChatMessage() (streaming) →
Backend: AI builds DAG + executes workflow →
Frontend: Real-time responses displayed →
Result: Workflow execution complete
```

### 4. Marketplace Flow

```
Dashboard → Click "Marketplace" →
Browse (Tabs: All | Workflows | Tools) →
Click item → Preview details →
Click "Install" → Added to Dashboard
```

### 5. MCP Integration

```
Chat Interface → Click MCP Icon →
MCP Modal opens:
  ├─ Catalog Tab: Browse & install from catalog
  └─ Custom Tab: Add custom MCP server
Select tools → Configure → Available in chat context
```

## Key Features

### Dashboard

- **Stats Grid**: Overview of workflows (Active, Runs, Cost)
- **Workflow Grid**: List of workflows with status and last run
- **Floating Action Bar**: Quick actions (Create, Marketplace, Settings)

### Chat Interface

- **Real-time Streaming**: SSE (Server-Sent Events) for AI responses
- **Conversation History**: Sidebar with conversation list
- **MCP Tools**: Modal for managing MCP tool integrations
- **File Upload**: Upload files directly in chat

### Marketplace

- **Browse**: Workflows and tools from the community
- **Filter**: By category, stars, downloads
- **Install**: One-click installation

### Workflow Management

- **Create Wizard**: 3-step wizard for workflow creation
- **Agent Detail**: View logs, history, and configuration
- **Edit**: Update workflow configuration
- **Run**: Manually execute workflows

## API Services

### ChatService

- `getConversations()` - List all conversations
- `createConversation()` - Create new conversation
- `sendChatMessage()` - Send message (supports streaming)
- `retryConversation()` - Retry a failed message
- `reconnectToJob()` - Reconnect to ongoing job

### MCPService

- List, install, and uninstall MCP tools
- Configure MCP server connections
- Execute MCP tools

### BuildService

- Build workflow DAG from natural language
- Execute workflows
- Monitor execution status

## Installation

### 1. Clone & Install

```bash
git clone <repository-url>
cd hyperkit-fe
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 3. Run in Development

```bash
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
pnpm build
pnpm start
```

## Scripts

- `pnpm dev` — Start development server
- `pnpm build` — Build for production
- `pnpm start` — Start production server
- `pnpm lint` — Run ESLint

## Data Models

### Workflow

```typescript
interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[]; // DAG nodes
  edges: WorkflowEdge[]; // Node connections
  status: "active" | "inactive" | "draft";
  description?: string;
  lastRun?: string;
  cost?: string;
}
```

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "model" | "assistant";
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}
```

## Development Guide

### Adding Components

```typescript
// 1. Create a file in components/[category]/
// 2. Export your component
// 3. Import it in the relevant page or parent component
```

### Adding API Endpoints

```typescript
// 1. Define types in types/[service].ts
// 2. Add your method in service/[service].ts
// 3. Use it with TanStack Query in your component
```

### Styling Guidelines

- Use Tailwind utility classes
- Custom theme colors: `hyper-950`, `hyper-accent`
- Dark theme by default
- Mobile-first responsive design

## Troubleshooting

```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install

# Type checking
pnpm tsc --noEmit
```

## License

Private and proprietary.

---

**Built with ❤️ by Hyperkit Team**
