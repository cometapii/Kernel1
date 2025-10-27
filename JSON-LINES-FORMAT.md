# JSON Lines Format - Comet Gemini

## 📋 Co to JSON Lines?

**JSON Lines** (`.jsonl`) to format tekstowy gdzie:
- Każda linia = jeden kompletny JSON object
- Linie oddzielone znakiem `\n` (newline)
- **BEZ** prefix "data: " (to jest SSE format)
- Prosty do parsowania w streaming

## Format vs SSE

### ❌ SSE (Server-Sent Events)
```
data: {"type":"text-delta","delta":"Hello"}\n
\n
data: {"type":"text-delta","delta":" world"}\n
\n
```
- Wymaga prefix `data: `
- Podwójny newline `\n\n` między eventami
- Bardziej złożony parsing

### ✅ JSON Lines (używamy w projekcie)
```
{"type":"text-delta","delta":"Hello","timestamp":1234567890}\n
{"type":"text-delta","delta":" world","timestamp":1234567891}\n
```
- Czysty JSON
- Pojedynczy newline `\n`
- Prostszy i szybszy parsing

## Implementacja w projekcie

### Serwer (app/api/chat/route.ts)

```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    const sendEvent = (data: any) => {
      // Dodaj metadane
      const eventData = {
        ...data,
        timestamp: Date.now(),
        requestId: requestId || "unknown",
      };
      
      // JSON Lines: JSON + newline
      const line = JSON.stringify(eventData) + '\n';
      controller.enqueue(encoder.encode(line));
      
      console.log(`[STREAM] Sent: ${data.type}`);
    };

    // Wysyłanie eventów
    sendEvent({ type: "text-delta", delta: "Hello" });
    sendEvent({ type: "text-delta", delta: " world" });
  }
});
```

### Klient (lib/use-optimized-chat.ts)

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // Dekoduj chunk
  buffer += decoder.decode(value, { stream: true });
  
  // Split na linie
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Zachowaj niekompletną linię

  // Parsuj każdą kompletną linię
  for (const line of lines) {
    if (!line.trim()) continue; // Skip pustych linii
    
    try {
      // Czysty JSON parse - BEZ slice(6)!
      const data = JSON.parse(line);
      
      // Natychmiastowe renderowanie z flushSync
      if (data.type === "text-delta") {
        flushSync(() => {
          setMessages(prev => /* ... */);
        });
      }
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }
  }
}
```

## Typy eventów

### Text streaming
```json
{"type":"text-delta","delta":"tekst","timestamp":1234567890}
```

### Tool calls
```json
{"type":"tool-call-start","toolCallId":"call_123","timestamp":1234567890}
{"type":"tool-name-delta","toolCallId":"call_123","toolName":"computer","timestamp":1234567891}
{"type":"tool-argument-delta","toolCallId":"call_123","delta":"{\"action\":","timestamp":1234567892}
{"type":"tool-input-available","toolCallId":"call_123","input":{"action":"screenshot"},"timestamp":1234567893}
{"type":"tool-output-available","toolCallId":"call_123","output":"Done","timestamp":1234567894}
```

### Screenshot updates
```json
{"type":"screenshot-update","screenshot":"base64...","timestamp":1234567895}
```

### Completion
```json
{"type":"finish","timestamp":1234567896}
```

## Zalety JSON Lines w naszym projekcie

1. **Prostota** - brak SSE boilerplate
2. **Szybkość** - mniej parsowania, bezpośredni JSON.parse()
3. **Debugging** - łatwe czytanie w network tab
4. **Kompatybilność** - działa z każdym fetch() API
5. **Real-time** - natychmiastowe przetwarzanie każdej linii

## Kluczowe zasady

### ✅ DO:
- Używaj `JSON.parse(line)` bezpośrednio
- Split na `\n`
- Zachowuj niekompletne linie w bufferze
- Używaj `flushSync()` dla każdej aktualizacji

### ❌ DON'T:
- ~~Nie używaj `line.slice(6)`~~ (to dla SSE)
- ~~Nie sprawdzaj `line.startsWith('data: ')`~~ (to dla SSE)
- ~~Nie dziel na `\n\n`~~ (to dla SSE)
- Nie buforuj kompletnych linii przed parsowaniem

## Testowanie

### W DevTools Network:
1. Otwórz request do `/api/chat`
2. W Response → Preview powinieneś widzieć:
```
{"type":"text-delta","delta":"H",...}
{"type":"text-delta","delta":"e",...}
{"type":"text-delta","delta":"l",...}
```

### W konsoli serwera:
```
[STREAM] Sent: text-delta at 2025-10-19T22:00:00.000Z
[STREAM] Sent: text-delta at 2025-10-19T22:00:00.001Z
```

## Migracja z SSE do JSON Lines

Jeśli masz stary kod z SSE:

```typescript
// ❌ STARE (SSE)
if (line.startsWith('data: ')) {
  const data = JSON.parse(line.slice(6));
}

// ✅ NOWE (JSON Lines)
if (line.trim()) {
  const data = JSON.parse(line);
}
```

## Referencje

- [JSON Lines spec](https://jsonlines.org/)
- MDN: [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- React: [flushSync](https://react.dev/reference/react-dom/flushSync)
