const url = 'ws://localhost:8080/ws';

const client = new Client(url, true);

client
    .on('error', error => console.log('oh no', error))
    .on('state', state => {
        console.log('got state', state)
        if (state.toPlay == client.myColor && state.result == 'playing') {
            const r = Math.trunc(Math.random() * state.plies.length);
            client.doPly(r);
        }
    })
    .createMachineGame();