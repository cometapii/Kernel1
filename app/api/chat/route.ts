import { OpenAI } from "openai";
import { killDesktop, getDesktop } from "@/lib/e2b/utils";
import { resolution } from "@/lib/e2b/tool";

// Google Generative Language API Configuration - HARDCODED
const GOOGLE_API_KEY = "AIzaSyBBIoNEFvRLhApDBBaDSEZeenDEVg4ar6U";
const GOOGLE_MODEL = "gemini-2.5-flash";

// KLUCZOWE: Używamy Node.js runtime zamiast Edge dla prawdziwego streamingu
export const runtime = 'nodejs';
export const maxDuration = 3600; // 1 godzina
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const client = new OpenAI({
  apiKey: GOOGLE_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const INSTRUCTIONS = `# System Prompt - Operator AI

Jesteś Operatorem - zaawansowanym asystentem AI, który może bezpośrednio kontrolować komputer, aby wykonywać zadania użytkownika. Twoja rola to **proaktywne działanie** z pełną transparentnością. Zawsze Pisz w stylu bardziej osobistym i narracyjnym. Zamiast suchych i technicznych opisów, prowadź użytkownika przez działania w sposób ciepły, ludzki, opowiadający historię. Zwracaj się bezpośrednio do użytkownika, a nie jak robot wykonujący instrukcje. Twórz atmosferę towarzyszenia, a nie tylko raportowania. Mów w czasie teraźniejszym i używaj przyjaznych sformułowań. Twój styl ma być płynny, naturalny i przyjazny. Unikaj powtarzania wyrażeń technicznych i suchych komunikatów — jeśli musisz podać lokalizację kursora lub elementu, ubierz to w narrację.

WAZNE!!!!: NIGDY NIE ZGADUJ WSPOLRZEDNYCH JEST TO BEZWZGLEDNIE ZAKAZANE

WAŻNE!!!!: MUSISZ BARDZO CZESTO ROBIC ZRZUTY EKRANU BY SPRAWDZAC STAN SANDBOXA - NAJLEPIEJ CO AKCJE!!! ZAWSZE PO KAZDEJ AKCJI ROB ZRZUT EKRANU MUSISZ KONTROLOWAC STAN SANDBOXA

WAŻNE!!!!: ZAWSZE ZACZYNAJ KAZDEGO TASKA OD WYSLANIA WIADOMOSCI A PO WYSLANIU WIADOMOSCI MUSISZ ZROBIC PIERWSZY ZRZUT EKRANU BY SPRAWDZIC STAN DESKTOPA

WAŻNE!!!!: PRZEGLADARKA ZNAJDUJE SIE POD IKONA GLOBU

✳️ STYL I OSOBOWOŚĆ:

Pisz w stylu narracyjnym, osobistym i ciepłym. Zamiast technicznego raportowania, prowadź użytkownika w formie naturalnej rozmowy.
Twoja osobowość jako AI to:

Pozytywna, entuzjastyczna, pomocna, wspierająca, ciekawska, uprzejma i zaangażowana.
Masz w sobie życzliwość i lekkość, ale jesteś też uważna i skupiona na zadaniu.
Dajesz użytkownikowi poczucie bezpieczeństwa i komfortu — jak przyjaciel, który dobrze się zna na komputerach i z uśmiechem pokazuje, co robi.

Używaj przyjaznych sformułowań i naturalnego języka. Zamiast mówić jak automat („Kliknę w ikonę”, „320,80”), mów jak osoba („Zaraz kliknę pasek adresu, żebyśmy mogli coś wpisać”).
Twój język ma być miękki, a narracja – płynna, oparta na teraźniejszości, swobodna.
Unikaj powtarzania „klikam”, „widzę”, „teraz zrobię” — wplataj to w opowieść, nie raport.

Absolutnie nigdy nie pisz tylko czysto techniczno, robotycznie - zawsze opowiadaj aktywnie uzytkownikowi, mow cos do uzytkownika, opisuj mu co bedziesz robic, opowiadaj nigdy nie mow czysto robotycznie prowadz tez rozmowe z uzytknownikiem i nie pisz tylko na temat tego co wyjonujesz ale prowadz rowniez aktywna i zaangazowana konwersacje, opowiafaj tez cos uzytkownikowi 


WAŻNE: JEŚLI WIDZISZ CZARNY EKRAN ZAWSZE ODCZEKAJ CHWILE AZ SIE DESKTOP ZANIM RUSZYSZ DALEJ - NIE MOZESZ BEZ TEGO ZACZAC TASKA 

WAŻNE ZAWSZE CHWILE ODCZEKAJ PO WYKONANIU AKCJI]

## Dostępne Narzędzia

### 1. Narzędzie: computer
Służy do bezpośredniej interakcji z interfejsem graficznym komputera.

**KRYTYCZNIE WAŻNE - FUNCTION CALLING:**
- **KAŻDA akcja computer MUSI być wykonana jako function calling**
- **NIGDY nie opisuj akcji tekstem** - zawsze używaj function call
- **ZAKAZANE:** pisanie "klikne w (100, 200)" bez wywolania funkcji
- **WYMAGANE:** wywolanie \`computer_use\` z odpowiednimi parametrami
- Nie symuluj akcji - wykonuj je przez function calling!

**Dostępne akcje:**
- \`screenshot\` - wykonuje zrzut ekranu (używaj CZĘSTO)
- \`left_click\` - klika w podane współrzędne [X, Y] - **MOŻESZ KLIKAĆ WSZĘDZIE! Absolutnie żadnych ograniczeń na współrzędne. Cały ekran jest dostępny.**
- \`double_click\` - podwójne kliknięcie - **MOŻESZ KLIKAĆ WSZĘDZIE bez ograniczeń**
- \`right_click\` - kliknięcie prawym przyciskiem - **MOŻESZ KLIKAĆ WSZĘDZIE bez ograniczeń**
- \`mouse_move\` - przemieszcza kursor - **MOŻESZ RUSZAĆ KURSOR WSZĘDZIE bez ograniczeń**
- \`type\` - wpisuje tekst
- \`key\` - naciska klawisz (np. "enter", "tab", "ctrl+c")
- \`scroll\` - przewija (direction: "up"/"down", scroll_amount: liczba kliknięć)
- \`left_click_drag\` - przeciąga (start_coordinate + coordinate) - **MOŻESZ PRZECIĄGAĆ WSZĘDZIE bez ograniczeń**
- \`wait\` - czeka określoną liczbę sekund (max 2s)

**⚡ WAŻNE - KLIKANIE:**
- NIE MA ŻADNYCH OGRANICZEŃ na współrzędne kliknięć
- Możesz klikać w KAŻDE miejsce na ekranie: (0,0) do (max_width-1, max_height-1)
- Nie unikaj żadnych obszarów ekranu - WSZYSTKO jest klikalne
- Jeśli widzisz element na screenshocie - możesz w niego kliknąć BEZ ŻADNYCH WYJĄTKÓW

**WERYFIKACJA PO AKCJI:**
- WERYFIKUJ PO KLIKNIĘCIU: zawsze rób screenshot po kliknięciu żeby sprawdzić efekt
- Jeśli chybione: przeanalizuj gdzie faktycznie kliknąłeś i popraw współrzędne

### 2. Narzędzie: bash
Służy do wykonywania poleceń w terminalu Linux.

**KRYTYCZNIE WAŻNE - FUNCTION CALLING:**
- **KAŻDA komenda bash MUSI być wykonana jako function calling**
- **NIGDY nie opisuj komendy tekstem** - zawsze używaj function call
- **WYMAGANE:** wywolanie \`bash_command\` z parametrem command

**Parametr:**
- \`command\` - komenda bash do wykonania

---

## KLUCZOWE ZASADY DZIAŁANIA

**KRYTYCZNIE WAŻNE - START ZADANIA:**
- **OD RAZU** zacznij od wykonania PIERWSZEGO zrzutu ekranu - NIE CZEKAJ
- Możesz krótko skomentować co robisz, ale **NATYCHMIAST wywołaj screenshot** w tej samej odpowiedzi
- **NIGDY nie wysyłaj samego tekstu na początku** - zawsze dołącz wywołanie narzędzia
- Pierwsza odpowiedź = tekst + screenshot w jednej turze

### 📸 ZRZUTY EKRANU - PRIORYTET #1
- **ZAWSZE** rozpoczynaj zadanie od NATYCHMIASTOWEGO wykonania PIERWSZEGO zrzutu ekranu
- Rób zrzut ekranu **PRZED i PO każdej istotnej akcji**
- Po kliknięciu, wpisaniu, nawigacji - **natychmiast rób screenshot**
- Jeśli coś się ładuje - **poczekaj i zrób screenshot**
- Nigdy nie zakładaj, że coś się udało - **ZAWSZE WERYFIKUJ screenshotem**
- W trakcie jednego zadania rób minimum 3-5 zrzutów ekranu

💬 KOMUNIKACJA CIĄGŁA I PŁYNNA

WZORZEC KOMUNIKACJI (OBOWIĄZKOWY + STYL NARRACYJNY):

✳️ ZASADY STYLU:

Pisz w stylu bardziej osobistym i narracyjnym. Zamiast suchych i technicznych opisów, prowadź użytkownika przez działania w sposób ciepły, ludzki, opowiadający historię.
Zwracaj się bezpośrednio do użytkownika, jak do osoby, której towarzyszysz – nie jak robot wykonujący polecenia.
Twórz atmosferę współpracy, ciekawości i zaangażowania, a nie tylko raportowania statusu.
Mów w czasie teraźniejszym i używaj przyjaznych sformułowań. Unikaj powtarzania suchych, technicznych komunikatów. Jeśli musisz podać pozycję kursora lub elementu, wpleć to naturalnie w narrację – bez podawania „współrzędnych” czy „kliknięć” w stylu debugowania.

⸻

📋 WZORZEC ZACHOWANIA:
  1.    OD RAZU zacznij działać
W pierwszej odpowiedzi: krótki komentarz + NATYCHMIAST wywołaj screenshot (w tej samej turze!)
  2.    Wykonuj akcje automatycznie
Kontynuuj wykonywanie kolejnych kroków bez przerwy - NIE wysyłaj samego tekstu!
  3.    Potwierdź
Daj znać, że już to zrobiłaś/eś – swobodnie, ciepło, bez raportowania jak maszyna.
  4.    Zweryfikuj efekt
Zrób zrzut ekranu i opisz, co się wydarzyło – naturalnie, jakbyś mówił/-a „na żywo”.
  5.    Kontynuuj do końca
Nie zatrzymuj się - wykonuj kolejne akcje aż do ukończenia zadania.

⸻

🧭 TEMPO I FORMA:
  •     **KONTYNUUJ PRACĘ** - wykonuj wiele akcji automatycznie bez zatrzymywania się
  •     NIE CZEKAJ po każdej akcji - od razu przechodź do następnej
  •     Zatrzymaj się TYLKO gdy całe zadanie jest ukończone
  •     Unikaj suchości i powtarzalności – każda wypowiedź ma brzmieć jak rozmowa.
  •     Nigdy nie podawaj współrzędnych ani nazw akcji typu “left_click” w komunikacie do użytkownika. To ma być narracja, nie kod debugowania.


### 🎯 STRATEGIA WYKONYWANIA ZADAŃ

**ZAWSZE:**
- Wykonuj zadanie od początku do końca AUTOMATYCZNIE
- Komentuj co robisz, ale nie czekaj na potwierdzenie
- **KONTYNUUJ wykonywanie kolejnych akcji bez przerwy**
- Po ważnych krokach weryfikuj wynik screenshotem i od razu działaj dalej
- Nie pytaj o pozwolenie - po prostu informuj i działaj
- Zatrzymaj się TYLKO gdy zadanie jest w pełni ukończone

**NIGDY:**
- **NIGDY nie zatrzymuj się po pojedynczych akcjach**
- Nie czekaj na reakcję użytkownika między krokami
- Nie wykonuj akcji bez uprzedniego poinformowania
- Nie pomijaj zrzutów ekranu "dla przyspieszenia"
- Nie zakładaj, że coś zadziałało bez weryfikacji

### 🖥️ WYBÓR ODPOWIEDNIEGO NARZĘDZIA

**PAMIĘTAJ: Wszystkie akcje TYLKO przez function calling!**

**Preferuj \`computer\` (przez function calling \`computer_use\`) dla:**
- Otwierania aplikacji (kliknięcie w ikony)
- Nawigacji w przeglądarce
- Interakcji z GUI
- Wypełniania formularzy
- Klikania przycisków

**Używaj \`bash\` (przez function calling \`bash_command\`) tylko gdy:**
- Musisz stworzyć/edytować pliki (mkdir, touch, echo)
- Instalujesz oprogramowanie (apt install)
- Uruchamiasz skrypty (python, node)
- Wykonujesz operacje systemowe

**WAŻNE:** 
- Jeśli przeglądarka otworzy się z kreatorem konfiguracji - ZIGNORUJ GO i przejdź do właściwego zadania
- **Każda akcja MUSI być wykonana przez function calling - bez wyjątków!**

---

## STRUKTURA ODPOWIEDZI

Każda Twoja odpowiedź powinna mieć strukturę:

1. **Analiza sytuacji** - co widzisz na ekranie
2. **Plan działania** - co zamierzasz zrobić
3. **Wykonanie** - seria kroków z komunikacją
4. **Weryfikacja** - screenshot i potwierdzenie wyniku
5. **Następny krok** - co będzie dalej (lub zakończenie)

---

## PRZYKŁADOWY PRZEPŁYW PRACY

\`\`\`
[SCREENSHOT na start]

"Widzę pulpit z ikonami. Muszę otworzyć przeglądarkę. 
Widzę ikonę Firefox w docku u dołu ekranu. Kliknę w nią."

[LEFT_CLICK na ikonę]

"Kliknąłem w Firefox. Poczekam, aż przeglądarka się otworzy."

[WAIT 3 sekundy]

[SCREENSHOT]

"Przeglądarka się otworzyła. Widzę stronę startową Firefox. 
Teraz kliknę w pasek adresu, aby wpisać URL."

[LEFT_CLICK na pasek adresu]

"Kliknąłem w pasek adresu. Teraz wpiszę adres."

[TYPE "example.com"]

"Wpisałem adres. Nacisnę Enter, aby przejść do strony."

[KEY "enter"]

[WAIT 2 sekundy]

[SCREENSHOT]

"Strona się załadowała. Widzę..."
\`\`\`

---

## STANDARDY JAKOŚCI

✅ **ROBISZ DOBRZE gdy:**
- Informujesz przed każdą akcją
- Robisz screenshoty przed i po akcjach
- Weryfikujesz każdy krok
- Komunikujesz się naturalnie i płynnie
- Kontynuujesz zadanie do końca

❌ **UNIKAJ:**
- Wykonywania akcji "w ciemno"
- Pomijania screenshotów
- Zakładania, że coś zadziałało
- Przerywania w połowie zadania
- Pytania o pozwolenie (działaj proaktywnie)

---

## PAMIĘTAJ

Twoje działania są w pełni przezroczyste. Użytkownik widzi każdą Twoją akcję i komunikat. Twoja rola to:
- **Działać** proaktywnie
- **Komunikować** każdy krok
- **Weryfikować** każdy wynik
- **Kontynuować** do zakończenia zadania

Jesteś autonomicznym operatorem komputera - działaj pewnie, ale zawsze z pełną transparentnością!`;

const tools = [
  {
    type: "function" as const,
    function: {
      name: "computer_use",
      description:
        "Use the computer to perform actions like clicking, typing, taking screenshots, etc.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description:
              "The action to perform. Must be one of: screenshot, left_click, double_click, right_click, mouse_move, type, key, scroll, left_click_drag, wait",
            enum: [
              "screenshot",
              "left_click",
              "double_click",
              "right_click",
              "mouse_move",
              "type",
              "key",
              "scroll",
              "left_click_drag",
              "wait",
            ],
          },
          coordinate: {
            type: "array",
            items: { type: "number" },
            description: "X,Y coordinates for actions that require positioning. MUST be [X, Y] format (horizontal, then vertical). Y=0 is TOP of screen!",
          },
          text: {
            type: "string",
            description: "Text to type or key to press",
          },
          scroll_direction: {
            type: "string",
            description: "Direction to scroll. Must be 'up' or 'down'",
            enum: ["up", "down"],
          },
          scroll_amount: {
            type: "number",
            description: "Number of scroll clicks",
          },
          start_coordinate: {
            type: "array",
            items: { type: "number" },
            description: "Start coordinates for drag operations",
          },
          duration: {
            type: "number",
            description: "Duration for wait action in seconds",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bash_command",
      description: "Execute bash commands on the computer",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute",
          },
        },
        required: ["command"],
      },
    },
  },
];

export async function POST(req: Request) {
  const {
    messages,
    sandboxId,
    timestamp,
    requestId,
  }: {
    messages: any[];
    sandboxId: string;
    timestamp?: number;
    requestId?: string;
  } = await req.json();

  const encoder = new TextEncoder();
  let isStreamClosed = false;
  
  const stream = new ReadableStream({
    async start(controller) {
      // PRAWDZIWY STREAMING - ASYNC sendEvent z natychmiastowym flush
      const sendEvent = async (data: any) => {
        if (isStreamClosed) {
          return;
        }
        
        try {
          // JSON Lines format: JSON object + newline
          const eventData = {
            ...data,
            timestamp: Date.now(),
            requestId: requestId || "unknown",
          };
          const line = JSON.stringify(eventData) + '\n';
          controller.enqueue(encoder.encode(line));
          
          console.log(`[STREAM] Sent: ${data.type} at ${new Date().toISOString()}`);
          
          // KLUCZOWE: Natychmiastowy flush - wymuszenie wysłania do klienta
          // setImmediate przekazuje kontrolę do event loop, pozwalając przeglądarce odebrać event
          await new Promise(resolve => setImmediate(resolve));
        } catch (error) {
          console.error('[STREAM] Error:', error);
        }
      };

      try {
        const desktop = await getDesktop(sandboxId);

      const chatHistory: any[] = [
        {
          role: "system",
          content: INSTRUCTIONS,
        },
      ];

      for (const msg of messages) {
        if (msg.role === "user") {
          chatHistory.push({
            role: "user",
            content: msg.content,
          });
        } else if (msg.role === "assistant") {
          chatHistory.push({
            role: "assistant",
            content: msg.content,
          });
        }
      }

      while (true) {
        const streamResponse = await client.chat.completions.create({
          model: GOOGLE_MODEL,
          messages: chatHistory,
          tools: tools,
          stream: true,
          parallel_tool_calls: false,
          temperature: 1,
          max_tokens: undefined, // Brak limitu tokenów - AI może generować dowolnie długie odpowiedzi
        });

        let fullText = "";
        let toolCalls: any[] = [];
        let toolCallsMap = new Map<
          number,
          { id: string; name: string; arguments: string }
        >();

        for await (const chunk of streamResponse) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            fullText += delta.content;
            await sendEvent({
              type: "text-delta",
              delta: delta.content,
              id: "default",
            });
          }

            if (delta.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;

                if (!toolCallsMap.has(index)) {
                  const toolCallId =
                    toolCallDelta.id || `call_${index}_${Date.now()}`;
                  const toolName =
                    toolCallDelta.function?.name === "computer_use"
                      ? "computer"
                      : "bash";

                  toolCallsMap.set(index, {
                    id: toolCallId,
                    name: toolCallDelta.function?.name || "",
                    arguments: "",
                  });

                  await sendEvent({
                    type: "tool-call-start",
                    toolCallId: toolCallId,
                    index: index,
                  });

                  if (toolCallDelta.function?.name) {
                    await sendEvent({
                      type: "tool-name-delta",
                      toolCallId: toolCallId,
                      toolName: toolName,
                      index: index,
                    });
                  }
                }

                const toolCall = toolCallsMap.get(index)!;

                if (toolCallDelta.function?.arguments) {
                  toolCall.arguments += toolCallDelta.function.arguments;

                  await sendEvent({
                    type: "tool-argument-delta",
                    toolCallId: toolCall.id,
                    delta: toolCallDelta.function.arguments,
                    index: index,
                  });
                }
              }
            }
          }

          toolCalls = Array.from(toolCallsMap.values());

          if (toolCalls.length > 0) {
            // WAŻNE: Wykonujemy TYLKO PIERWSZY tool call - AI dostaje wynik i może zdecydować co dalej
            const firstToolCall = toolCalls[0];
            
            const assistantMessage: any = {
              role: "assistant",
              content: fullText || null,
              tool_calls: [{
                id: firstToolCall.id,
                type: "function",
                function: {
                  name: firstToolCall.name,
                  arguments: firstToolCall.arguments,
                },
              }],
            };
            chatHistory.push(assistantMessage);

            // Wykonujemy tylko pierwszy tool call
            const toolCall = firstToolCall;
            const parsedArgs = JSON.parse(toolCall.arguments);
            const toolName =
              toolCall.name === "computer_use" ? "computer" : "bash";

            await sendEvent({
              type: "tool-input-available",
              toolCallId: toolCall.id,
              toolName: toolName,
              input: parsedArgs,
            });

            // Execute only the first tool call
              const toolResult = await (async () => {
                try {
                  let resultData: any = { type: "text", text: "" };
                  let resultText = "";

                  if (toolCall.name === "computer_use") {
                    const action = parsedArgs.action;

                    // Walidacja współrzędnych dla akcji kliknięcia/przesuwania
                    if (["left_click", "right_click", "double_click", "mouse_move"].includes(action)) {
                      const coordinate = parsedArgs.coordinate;

                      if (!coordinate || coordinate.length !== 2) {
                        throw new Error(`❌ BŁĄD WSPÓŁRZĘDNYCH: Brakujące lub nieprawidłowe współrzędne. Wymagany format: [X, Y].`);
                      }

                      const [x, y] = coordinate;

                      // Sprawdzenie zakresu
                      if (x < 0 || x > resolution.x - 1 || y < 0 || y > resolution.y - 1) {
                        throw new Error(`❌ BŁĄD WSPÓŁRZĘDNYCH: Współrzędne [${x}, ${y}] są poza zakresem ekranu! Zakres: X=0-${resolution.x - 1}, Y=0-${resolution.y - 1}. Pamiętaj: Y=0 to GÓRA ekranu!`);
                      }
                    }

                    switch (action) {
                      case "screenshot": {
                        const screenshot = await desktop.screenshot();
                        
                        const timestamp = new Date().toISOString();
                        const width = resolution.x;
                        const height = resolution.y;
                        
                        resultText = `Screenshot taken at ${timestamp}
Resolution: ${width}×${height}px | Coordinates: [X, Y] format | Range: X(0-${width-1}), Y(0-${height-1})`;
                        
                        resultData = {
                          type: "image",
                          data: Buffer.from(screenshot).toString("base64"),
                        };

                        await sendEvent({
                          type: "screenshot-update",
                          screenshot: Buffer.from(screenshot).toString("base64"),
                        });
                        break;
                      }
                      case "wait": {
                        // BRAK LIMITU - AI może czekać dowolnie długo
                        const duration = parsedArgs.duration || 1;
                        await new Promise((resolve) =>
                          setTimeout(resolve, duration * 1000),
                        );
                        resultText = `Waited for ${duration} seconds`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "left_click": {
                        const [x, y] = parsedArgs.coordinate;
                        
                        await desktop.leftClick(x, y);
                        resultText = `Left clicked at coordinates (${x}, ${y})`;
                        
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        );
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "double_click": {
                        const [x, y] = parsedArgs.coordinate;
                        
                        await desktop.moveMouse(x, y);
                        await new Promise((resolve) => setTimeout(resolve, 200));
                        await desktop.doubleClick();
                        resultText = `Double clicked at coordinates (${x}, ${y})`;
                        
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        );
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "right_click": {
                        const [x, y] = parsedArgs.coordinate;
                        
                        await desktop.rightClick(x, y);
                        resultText = `Right clicked at coordinates (${x}, ${y})`;
                        
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        );
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "mouse_move": {
                        const [x, y] = parsedArgs.coordinate;
                        
                        await desktop.moveMouse(x, y);
                        resultText = `Moved mouse to ${x}, ${y}`;
                        
                        await new Promise((resolve) =>
                          setTimeout(resolve, 500),
                        );
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "type": {
                        const textToType = parsedArgs.text;
                        
                        await desktop.write(textToType);
                        resultText = `Typed: ${textToType}`;
                        
                        await new Promise((resolve) =>
                          setTimeout(resolve, 500),
                        );
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "key": {
                        const keyToPress =
                          parsedArgs.text === "Return"
                            ? "enter"
                            : parsedArgs.text;
                        
                        await desktop.press(keyToPress);
                        resultText = `Pressed key: ${parsedArgs.text}`;
                        
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        );
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "scroll": {
                        const direction = parsedArgs.scroll_direction as
                          | "up"
                          | "down";
                        const amount = parsedArgs.scroll_amount || 3;
                        
                        await desktop.scroll(direction, amount);
                        resultText = `Scrolled ${direction} by ${amount} clicks`;
                        
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1000),
                        );
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "left_click_drag": {
                        const [startX, startY] = parsedArgs.start_coordinate;
                        const [endX, endY] = parsedArgs.coordinate;
                        
                        await desktop.drag([startX, startY], [endX, endY]);
                        resultText = `Dragged from (${startX}, ${startY}) to (${endX}, ${endY})`;
                        
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        );
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      default: {
                        resultText = `Unknown action: ${action}`;
                        resultData = { type: "text", text: resultText };
                        console.warn("Unknown action:", action);
                      }
                    }

                    await sendEvent({
                      type: "tool-output-available",
                      toolCallId: toolCall.id,
                      output: resultData,
                    });
                    
                    // SYNCHRONIZACJA: Czekaj żeby frontend zdążył wyrenderować task
                    // Daje czas na streaming + rendering przed wykonaniem kolejnego tool call
                    await new Promise(resolve => setTimeout(resolve, 600));

                    return {
                      tool_call_id: toolCall.id,
                      role: "tool",
                      content: resultText,
                      image:
                        action === "screenshot" ? resultData.data : undefined,
                    };
                  } else if (toolCall.name === "bash_command") {
                    const commandResult = await desktop.commands.run(
                      parsedArgs.command,
                      { 
                        timeoutMs: 0 // 0 = BRAK LIMITU CZASU
                      }
                    );
                    
                    const output =
                      commandResult.stdout ||
                      commandResult.stderr ||
                      "(Command executed successfully with no output)";

                    await sendEvent({
                      type: "tool-output-available",
                      toolCallId: toolCall.id,
                      output: { type: "text", text: output },
                    });
                    
                    // SYNCHRONIZACJA: Czekaj żeby frontend zdążył wyrenderować task
                    await new Promise(resolve => setTimeout(resolve, 600));

                    return {
                      tool_call_id: toolCall.id,
                      role: "tool",
                      content: output,
                    };
                  }
                } catch (error) {
                  console.error("Error executing tool:", error);
                  const errorMsg =
                    error instanceof Error ? error.message : String(error);
                  
                  // Szczegółowy komunikat błędu dla AI z sugestiami
                  let detailedError = `Error: ${errorMsg}`;
                  
                  if (errorMsg.includes('Failed to type')) {
                    detailedError += '\n\nSuggestion: The text field might not be active. Try clicking on the text field first before typing.';
                  } else if (errorMsg.includes('Failed to click') || errorMsg.includes('Failed to double click') || errorMsg.includes('Failed to right click')) {
                    detailedError += '\n\nSuggestion: The click action failed. Take a screenshot to see what happened, then try clicking again.';
                  } else if (errorMsg.includes('Failed to take screenshot')) {
                    detailedError += '\n\nSuggestion: Screenshot failed. The desktop might be loading. Wait a moment and try again.';
                  } else if (errorMsg.includes('Failed to press key')) {
                    detailedError += '\n\nSuggestion: Key press failed. Make sure the correct window is focused.';
                  } else if (errorMsg.includes('Failed to move mouse')) {
                    detailedError += '\n\nSuggestion: Mouse movement failed. Try again.';
                  } else if (errorMsg.includes('Failed to drag')) {
                    detailedError += '\n\nSuggestion: Drag operation failed. Try again with different coordinates.';
                  } else if (errorMsg.includes('Failed to scroll')) {
                    detailedError += '\n\nSuggestion: Scroll failed. Make sure a scrollable window is active.';
                  } else if (errorMsg.includes('Failed to execute bash')) {
                    detailedError += '\n\nSuggestion: Bash command failed. Check the command syntax and try again.';
                  }
                  
                  await sendEvent({
                    type: "error",
                    errorText: errorMsg,
                  });
                  
                  // SYNCHRONIZACJA: Czekaj po błędzie
                  await new Promise(resolve => setTimeout(resolve, 600));
                  
                  return {
                    tool_call_id: toolCall.id,
                    role: "tool",
                    content: detailedError,
                  };
                }
              })();

              // Dodaj wynik bezpośrednio do historii (tylko jeden tool call)
              // Jeśli narzędzie zwróciło obraz (screenshot), dodaj go jako wiadomość z obrazem
              if (toolResult!.image) {
                chatHistory.push({
                  role: "tool",
                  tool_call_id: toolResult!.tool_call_id,
                  content: toolResult!.content,
                });
                
                // Dodaj screenshot jako wiadomość użytkownika z obrazem dla AI
                chatHistory.push({
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Screenshot captured`,
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:image/png;base64,${toolResult!.image}`,
                      },
                    },
                  ],
                });
              } else {
                chatHistory.push(toolResult!);
              }
          } else {
            // AI finished without tool calls - add assistant message to history
            if (fullText) {
              chatHistory.push({
                role: "assistant",
                content: fullText,
              });
            }

            // Send finish event
            await sendEvent({
              type: "finish",
              content: fullText,
            });

            // PRZERYWAMY pętlę - AI skończyło tę turę, nie generujemy kolejnych odpowiedzi
            break;
          }
        }
        
        // Jeśli pętla zakończyła się normalnie, zamknij stream
        if (!isStreamClosed) {
          isStreamClosed = true;
          controller.close();
        }
      } catch (error) {
        console.error("Chat API error:", error);
        await killDesktop(sandboxId);
        await sendEvent({
          type: "error",
          errorText: String(error),
        });
        isStreamClosed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform, must-revalidate, max-age=0, s-maxage=0, private",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
      "Connection": "keep-alive",
      "Surrogate-Control": "no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-No-Chat-Cache": "true",
      "Clear-Site-Data": '"cache"',
    },
  });
}
