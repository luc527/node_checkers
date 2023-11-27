
const WS_HOST = process.env.WS_HOST;
const WS_PORT = process.env.WS_PORT;

export async function fetchGameHistory(mode, uuid) {
    const resp = await fetch(`http://${WS_HOST}:${WS_PORT}/game?mode=${mode}&id=${uuid}`)
    const text = await resp.text();
    try {
        const history = JSON.parse(text);
        return history;
    } catch (error) {
        console.error(`failed to fetch game history: ${error}`);
        return null;
    }
}