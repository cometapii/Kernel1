# 🔧 Azure OpenAI - Streaming Token-by-Token

## Problem
Azure Content Filter **domyślnie buforuje tokeny** zanim je wyśle, przez co streaming wygląda na "paczki" zamiast płynnego strumienia słowo po słowie.

## Rozwiązanie: Asynchronous Filter

### 1. Włącz w Azure Portal

1. Wejdź na **Azure AI Studio** (https://ai.azure.com)
2. Wybierz swój zasób OpenAI
3. Idź do **Safety + Security** > **Content Filters**
4. Utwórz nowy filtr lub edytuj istniejący
5. W sekcji **Streaming mode** zmień z **"Default"** na **"Asynchronous Filter"**
6. Zapisz i przypisz do swojego deploymentu

### Co to daje?
- ✅ **Tokeny płyną natychmiast** - bez buforowania
- ✅ **Prawdziwy real-time streaming** - litera po literze
- ✅ **Zero opóźnień** - filtr działa asynchronicznie w tle

### Trade-off
- ⚠️ Filtrowanie treści odbywa się **po** wysłaniu tokena
- Szkodliwa treść może pojawić się na chwilę przed flagowaniem

---

## Kod - Już skonfigurowany ✅

### API Version
```typescript
const AZURE_API_VERSION = "2024-12-01-preview"; // ✅ Wspiera async streaming
```

### React - Zero Batching
```typescript
import { flushSync } from "react-dom";

// Każdy token renderuje się NATYCHMIAST
flushSync(() => {
  setMessages([...messagesRef.current]);
});
```

### Backend - No Buffering
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// HTTP headers wymuszają zero cache
headers: {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'X-Accel-Buffering': 'no',
  'Connection': 'keep-alive'
}
```

---

## Testowanie

Przed włączeniem Asynchronous Filter:
```
[02:31:33.367Z] token
[02:31:33.367Z] token  ← wszystkie w tej samej ms
[02:31:33.367Z] token
[02:31:34.240Z] token  ← kolejna paczka
[02:31:34.240Z] token
```

Po włączeniu Asynchronous Filter:
```
[02:31:33.001Z] token
[02:31:33.015Z] token  ← każdy osobno
[02:31:33.032Z] token
[02:31:33.047Z] token  ← płynny strumień
```

---

## Dokumentacja Azure
- [Content Streaming - Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/content-streaming)
- [Asynchronous Filter Guide](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/content-filters)
