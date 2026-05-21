# Implementation Phase 1: Setup

## Goal

Initialize a clean, strictly-typed monorepo environment for the Electron + React 18 project with minimal dependencies using Shadcn UI.

## Step 1: Scaffold the Project

We utilize Vite's official React-TypeScript template and inject Electron.

```bash
# 1. Initialize Vite React project
npm create vite@latest nuxy-rebuild -- --template react-ts
cd nuxy-rebuild

# 2. Install Electron dev dependencies
npm install -D electron vite-plugin-electron vite-plugin-electron-renderer electron-builder

# 3. Install core production dependencies
npm install lucide-react clsx tailwind-merge
```

## Step 2: Tailwind & Shadcn Setup

To ensure UI components are copy-pasted (zero hidden dependencies), we configure Shadcn UI.

```bash
# 1. Initialize Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 2. Initialize Shadcn UI
npx shadcn-ui@latest init
# (Select: TypeScript, Default style, Slate color, css variables: yes)

# 3. Add fundamental UI components
npx shadcn-ui@latest add button input scroll-area card dialog toast
```

## Step 3: Folder Structure Setup

Ensure your working directory matches the exact modular blueprint.

```bash
mkdir -p electron/main electron/core electron/sandbox src/components src/shared/types
```

**Resulting Structure:**

```text
/
├── electron/
│   ├── main/       (App lifecycle, WindowManager.ts, ExtensionScanner.ts)
│   ├── core/       (Storage.ts, IpcRouter.ts - CoreContext providers)
│   ├── sandbox/    (Worker Thread Manager)
│   └── preload/    (preload.ts - Context bridge)
├── src/
│   ├── components/ (Shadcn UI & generic components like OmniBar)
│   ├── hooks/      (Custom React state hooks)
│   ├── lib/        (Utility functions, e.g., Shadcn's utils.ts)
│   ├── App.tsx     (The dynamic router)
│   └── index.css   (Global CSS/Tailwind)
├── shared/
│   └── types/      (Interfaces: CoreContext, IpcResponse)
```

## Step 4: Tooling & Strict Configuration

Modify `tsconfig.json` to enforce absolute strictness.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@core/*": ["./shared/*"]
    }
  }
}
```

---

**Next Phase:** [02. Core Infrastructure](./02-core-infrastructure.md) | **Overview:** [Roadmap](../14-rebuild-roadmap.md)
