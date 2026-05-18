# 07 - Database Design & Data Isolation

## 1. Persistence Philosophy
Nuxy operates as an offline-first, local-only application. Because extensions are built by third parties, local persistence must be:
- **Fast**: File I/O should not block the main Node.js thread.
- **Isolated**: The Notes module should never have the ability to accidentally (or maliciously) corrupt the Clipboard database.
- **Durable**: Application crashes should not result in corrupted JSON files.

## 2. Storage Architectures (The Chroot Jail)

Because Nuxy aims for security, extensions running in Worker threads do not have `fs` access. The `core.storage` API is an IPC wrapper that sends a request to the Kernel.

The Kernel enforces a Chroot jail:

```typescript
// electron/core/StorageEngine.ts
import fs from 'node:fs/promises';
import path from 'node:path';

export class StorageEngine {
  constructor(private userExtDataPath: string) {}

  async writeAtomic(extensionId: string, filename: string, data: any) {
    // 1. Path Traversal Prevention
    if (filename.includes('..')) throw new Error('Path traversal detected');

    // 2. Chroot Resolution (~/.nuxy/data/com.nuxy.clipboard/data.json)
    const filePath = path.join(this.userExtDataPath, extensionId, filename);
    const tempPath = `${filePath}.tmp`;
    
    // 3. Atomic Write
    await fs.writeFile(tempPath, JSON.stringify(data), 'utf-8');
    await fs.rename(tempPath, filePath);
  }
}
```

## 3. Standard Extension Schemas

While extensions define their own logic, here is how the primary utilities structure their JSON databases.

### 3.1 Notes Extension
```typescript
interface NoteSchema {
  id: string;          // UUID v4
  title: string;       // Extracted from first markdown heading
  content: string;     // Raw markdown text
  createdAt: number;   
  updatedAt: number;   
}
```

### 3.2 Clipboard Manager Extension
Stored as a rolling JSON log. The backend Worker thread truncates this upon startup (e.g., keep only the last 1,000 entries) to prevent RAM exhaustion.
```typescript
interface ClipboardEntry {
  id: string;
  type: 'text' | 'image';
  hash: string;        // SHA-256 of content to prevent duplicate entries
  content: string;     // Raw text, or base64
  timestamp: number;
}
```
