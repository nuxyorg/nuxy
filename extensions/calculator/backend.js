export function register(core) {
  core.registry.registerProvider({
    name: 'calculator'
  });

  core.ipc.handle('eval', async (payload) => {
    try {
      const text = payload.text;
      // Simple regex validation to allow only math expressions
      if (/^[0-9+\-*/().\s]+$/.test(text) && text.trim() !== '') {
        // eslint-disable-next-line no-eval
        const result = eval(text);
        if (result !== undefined && !isNaN(result)) {
          return {
            items: [{
              id: 'calc-result',
              title: `= ${result}`,
              subtitle: 'Calculator Provider',
              value: result
            }]
          };
        }
      }
    } catch (e) {
      // Ignore syntax errors while typing
    }
    
    return { items: [] };
  });
}
