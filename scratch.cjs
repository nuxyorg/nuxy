const { app, clipboard } = require('electron')
app.whenReady().then(() => {
  console.log('Formats:', clipboard.availableFormats())
  console.log('URI list:', clipboard.read('text/uri-list'))
  app.quit()
})
