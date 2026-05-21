#!/bin/bash
SOCKET="/tmp/nuxy.sock"

send_command() {
    node -e "
    const net = require('net');
    const client = net.connect('$SOCKET', () => {
        client.write('$1');
        client.end();
    });
    client.on('error', () => process.exit(1));
    " 2>/dev/null
}

if [ "$1" == "toggle" ]; then
    if [ -S "$SOCKET" ]; then
        send_command "toggle"
    else
        echo "Nuxy is not running."
    fi
else
    if [ -S "$SOCKET" ]; then
        send_command "show"
    else
        DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        cd "$DIR"
        pnpm dev &
    fi
fi
