export function register(core) {
  core.registry.registerTool({
    name: 'clipboard'
  });

    let history = [];
    let lastText = '';

    // Initialize from sandboxed storage
    async function init() {
      try {
        const stored = await core.storage.read('history.json');
        if (Array.isArray(stored)) {
          history = stored;
        } else {
          history = [];
        }
        core.logger.info(`Loaded ${history.length} clipboard history item(s) from storage.`);
      } catch (err) {
        core.logger.error('Failed to read clipboard history from storage, initializing empty.', err);
        history = [];
      }

      // Initialize the lastText with current clipboard value to prevent initial double-add
      try {
        lastText = await core.clipboard.readText() || '';
        // If there's something already on clipboard and history is empty, add it
        if (lastText && lastText.trim() && history.length === 0) {
          await addHistoryItem(lastText);
        }
      } catch (err) {
        core.logger.error('Failed to read initial system clipboard.', err);
      }

      // Start the monitoring loop (polling every 1000ms)
      setInterval(async () => {
        try {
          const currentText = await core.clipboard.readText();
          if (currentText && currentText.trim() && currentText !== lastText) {
            lastText = currentText;
            await addHistoryItem(currentText);
          }
        } catch (err) {
          // Gracefully log error if clipboard becomes temporarily unavailable
          core.logger.silly('Error reading clipboard in poll loop', err);
        }
      }, 1000);
    }

    // Add a text item to the history, deduplicate, and persist
    async function addHistoryItem(text) {
      const newItem = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(),
        text: text,
        copiedAt: new Date().toISOString()
      };

      // De-duplicate: remove older items with exact same text
      history = [newItem, ...history.filter(item => item.text !== text)];

      // Cap at 100 entries
      if (history.length > 100) {
        history = history.slice(0, 100);
      }

      // Persist to sandboxed storage
      try {
        await core.storage.write('history.json', history);
      } catch (err) {
        core.logger.error('Failed to write clipboard history to storage.', err);
      }
    }

    // IPC Handler: get history list
    core.ipc.handle('getHistory', async () => {
      return history;
    });

    // IPC Handler: clear all items
    core.ipc.handle('clearHistory', async () => {
      history = [];
      try {
        await core.storage.write('history.json', history);
      } catch (err) {
        core.logger.error('Failed to clear clipboard storage.', err);
      }
      return history;
    });

    // IPC Handler: delete specific item
    core.ipc.handle('deleteItem', async (id) => {
      history = history.filter(item => item.id !== id);
      try {
        await core.storage.write('history.json', history);
      } catch (err) {
        core.logger.error('Failed to update clipboard storage after deletion.', err);
      }
      return history;
    });

    // IPC Handler: copy item to system clipboard and move it to top of history
    core.ipc.handle('copyItem', async (id) => {
      const found = history.find(item => item.id === id);
      if (found) {
        try {
          await core.clipboard.writeText(found.text);
          lastText = found.text; // Prevent triggering the poll loop since we set it ourselves
          
          // Re-sort: Move this item to the top of the history list
          found.copiedAt = new Date().toISOString();
          history = [found, ...history.filter(item => item.id !== id)];
          await core.storage.write('history.json', history);
        } catch (err) {
          core.logger.error(`Failed to copy item "${id}" to clipboard.`, err);
        }
      }
      return history;
    });

    // Run initialization
    init();
}
