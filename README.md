<div align="center">

# 🌌 Aevum Workspace

**The Next-Generation Local-First Knowledge Engine & Autonomous Multi-Agent Workspace**

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20Desktop%20%7C%20Cloud-6366f1?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/Backend-%40aevum%2Fserver-10b981?style=for-the-badge" alt="Backend" />
  <img src="https://img.shields.io/badge/Architecture-Multi--Agent%20SLPC-ec4899?style=for-the-badge" alt="Architecture" />
  <img src="https://img.shields.io/badge/License-MIT%2FApache-orange?style=for-the-badge" alt="License" />
</p>

<p align="center">
  Aevum unites structured document authoring, infinite whiteboard canvas, local-first privacy, and autonomous agent orchestration into a single, high-performance workspace.
</p>

---

</div>

## 🚀 Key Highlights

- **🔒 Local-First & Privacy Sovereign**: Full data ownership with offline-first indexing, zero-cloud dependency, and end-to-end encrypted peer synchronization.
- **🎨 Hyper-Fused Canvas**: Seamlessly toggle between structured page document view and an infinite edgeless whiteboard canvas with real-time vector graphics.
- **🤖 Multi-Agent Copilot Integration**: Native orchestration hooks designed for autonomous agent pairing, code analysis, real-time context retrieval, and intelligent document synthesis.
- **⚡ High-Performance Architecture**: Powered by `@aevum/server` (NestJS microservices) and `@aevum/server-native` high-throughput Rust extensions.
- **🐳 Enterprise Containerization**: Ready-to-deploy Docker multi-stage builds and `docker-compose` orchestration with PostgreSQL, Redis, and MinIO storage.

---

## 🏗️ System Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │                  Aevum Client Engine                   │
               │   (React 18 • Jotai • Vanilla-Extract • Rspack/Vite)   │
               └──────────────────────────┬─────────────────────────────┘
                                          │ GraphQL / WebSocket / REST
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │                     @aevum/server                      │
               │     NestJS Enterprise Cloud & Collaboration Server     │
               └──────────────┬───────────────────────────┬─────────────┘
                              │                           │
                     ┌────────▼────────┐         ┌────────▼────────┐
                     │  @aevum/native  │         │  Microservices  │
                     │  (Rust Engine)  │         │  Auth, Doc Sync │
                     └─────────────────┘         └─────────────────┘
                              │                           │
            ┌─────────────────┴───────────────────────────┴─────────────────┐
            ▼                                                               ▼
   ┌─────────────────┐                                             ┌─────────────────┐
   │   PostgreSQL    │                                             │   Redis Cache   │
   │  Prisma Models  │                                             │   BullMQ Queue  │
   └─────────────────┘                                             └─────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Web & Desktop** | React 18, TypeScript, Jotai State Machine, Vanilla-Extract CSS, Electron |
| **Backend Core** | `@aevum/server` (NestJS), `@aevum/server-native` (Rust Neon/N-API bindings) |
| **Data Persistence** | PostgreSQL 16, Prisma ORM, Redis (BullMQ queues & PubSub cache) |
| **Tooling & Bundler** | Rspack, Webpack, Yarn Modern Workspaces, Rust Toolchain (`cargo`) |
| **DevOps & CI/CD** | Docker Multi-stage, Docker Compose, GitHub Actions Automated Pipelines |

---

## 🏁 Quickstart

### Prerequisites
- **Node.js**: `v22.x` or later
- **Yarn**: Modern Berry (`corepack enable`)
- **Rust**: `v1.80+` (optional, for `@aevum/server-native` source builds)
- **Docker & Docker Compose**: For local backend dependencies

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/baobao0303/Aevum.git
cd Aevum
yarn install
```

### 2. Start Local Cloud Infrastructure
```bash
docker-compose -f docker-compose.backend.yml up -d
```

### 3. Launch Development Environments
- **Frontend Web Workspace**:
  ```bash
  yarn dev -p @aevum/web
  ```
- **Backend Cloud Server**:
  ```bash
  yarn dev:server
  ```

---

## 👥 Multi-Agent Engineering Team (SLPC)

This repository was engineered following the **SLPC Multi-Agent Architecture**:

- **Supervisor Agent** (`supervisor@aevum.ai`): Intent guarding, project specification & workspace scaffolding.
- **Lead Architect Agent** (`architect@aevum.ai`): Modular core architecture, `@aevum/server` package decoupling, and build tools.
- **Frontend Agent** (`frontend@aevum.ai`): Visual branding, transparent asset pipeline, modern authentication UI & layout.
- **Backend Agent** (`backend@aevum.ai`): Auth controller logic, magic links, email notification templates & schema migrations.
- **DevOps Agent** (`devops@aevum.ai`): Docker multi-stage containerization & GitHub Actions CI/CD workflows.
- **QA/QC Agent** (`qc@aevum.ai`): Playwright E2E suites, integration adapters, and verification gates.
- **Tech Lead & Release Manager**: **`baobao0303`** (`baobao22.work@gmail.com`) - PR Review, approval & final integration.

---

## 📄 License

Licensed under the Apache 2.0 / MIT Dual License. See [LICENSE](./LICENSE) for details.
