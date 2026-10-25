using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
namespace Lemon2;

public sealed record Conversation(string Id, string Title, string Model, List<Message> Messages, GenerationConfig? Configuration = null);
public sealed record History(int Version, List<Conversation> Conversations);
public sealed class ConversationStore
{
    private readonly string path;
    public ConversationStore(string? filePath = null) => path = filePath ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Lemon2", "history.json");
    public async Task<List<Conversation>> LoadAsync()
    {
        if (!File.Exists(path)) return [];
        var saved = await Task.Run(async () => JsonSerializer.Deserialize<History>(await File.ReadAllTextAsync(path))) ?? throw new InvalidDataException("Verlauf ist ungültig.");
        if (saved.Version != 1 || saved.Conversations is null || saved.Conversations.Any(c => c is null || c.Messages is null || c.Messages.Any(m => m is null || m.Content is null || m.Role is not ("user" or "assistant")))) throw new InvalidDataException("Verlaufsversion oder Nachrichten sind ungültig. Die Datei wurde nicht verändert.");
        return saved.Conversations;
    }
    private readonly SemaphoreSlim writeLock = new(1, 1);
    public async Task SaveAsync(List<Conversation> conversations)
    {
        await writeLock.WaitAsync();
        try {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporary = path + ".tmp";
        var snapshot = conversations.Select(chat => chat with { Messages = chat.Messages.Select(message => message.Snapshot()).ToList() }).ToList();
        await Task.Run(async () => { await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(new History(1, snapshot))); });
        File.Move(temporary, path, true);
        } finally { writeLock.Release(); }
    }
}
public sealed class ChatService : IDisposable
{
    private readonly HttpClient http;
    public ChatService(HttpMessageHandler? handler = null) { http = handler is null ? new HttpClient() : new HttpClient(handler); http.Timeout = Timeout.InfiniteTimeSpan; }
    public async IAsyncEnumerable<string> StreamAsync(Uri server, string model, IEnumerable<Message> messages, [EnumeratorCancellation] CancellationToken token, GenerationConfig? configuration = null)
    {
        if (server.Scheme != "https" && !(server.IsLoopback && server.Scheme == "http")) throw new InvalidOperationException("Bitte eine HTTPS-Worker-Adresse verwenden.");
        var json = ApiRequest.Serialize(model, messages, configuration, true);
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(server, configuration is null ? "/api/chat" : "/api/v2/chat")) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
        using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token);
        if (!response.IsSuccessStatusCode) throw new HttpRequestException($"Backend meldet {(int)response.StatusCode}. Bitte Verbindung und Cloudflare-Kontingent prüfen.");
        if (response.Content.Headers.ContentType?.MediaType != "text/event-stream") throw new InvalidDataException("Das Backend liefert keinen SSE-Stream.");
        using var reader = new StreamReader(await response.Content.ReadAsStreamAsync(token));
        var lines = new BoundedLineReader(reader);
        var complete = false;
        while (await lines.ReadLineAsync(token) is { } line)
        {
            if (line.Length > 1_000_000) throw new InvalidDataException("Stream-Ereignis zu groß.");
            if (!line.StartsWith("data:")) continue;
            var data = line[5..].Trim();
            if (data == "[DONE]") { complete = true; break; }
            if (data.Length == 0) continue;
            using var document = JsonDocument.Parse(data);
            var root = document.RootElement;
            if (root.TryGetProperty("error", out _)) throw new InvalidDataException("Das Modell hat einen Fehler gemeldet.");
            if (root.TryGetProperty("response", out var text) && text.ValueKind == JsonValueKind.String) yield return text.GetString()!;
            else if (root.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
            {
                var choice = choices[0];
                if (choice.TryGetProperty("finish_reason", out var finish) && finish.ValueKind == JsonValueKind.String) complete = true;
                if (choice.TryGetProperty("delta", out var delta) && delta.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.String) yield return content.GetString()!;
            }
        }
        if (!complete) throw new IOException("Antwort unterbrochen. Bisheriger Text bleibt erhalten.");
    }
    public async Task<ModelCatalogue> GetModelsAsync(Uri server, CancellationToken token)
    {
        ValidateServer(server);
        using var response = await http.GetAsync(new Uri(server, "/api/v2/models"), token);
        response.EnsureSuccessStatusCode();
        var catalogue = JsonSerializer.Deserialize<ModelCatalogue>(await response.Content.ReadAsStringAsync(token), new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? throw new InvalidDataException("Modellkatalog fehlt.");
        if (catalogue.Version != 2 || catalogue.Models is null || catalogue.Models.Count is < 1 or > 100 || catalogue.TierDefaults is null) throw new InvalidDataException("Modellkatalog ist ungültig.");
        return catalogue;
    }
    public async Task<CanvasReply> GenerateCanvasAsync(Uri server, string model, IEnumerable<Message> messages, GenerationConfig configuration, CancellationToken token)
    {
        ValidateServer(server);
        var json = ApiRequest.Serialize(model, messages, configuration with { OutputMode = "canvas" }, false);
        using var response = await http.PostAsync(new Uri(server, "/api/v2/chat"), new StringContent(json, Encoding.UTF8, "application/json"), token);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadAsStringAsync(token);
        if (payload.Length > 1_000_000) throw new InvalidDataException("Antwort zu groß.");
        using var document = JsonDocument.Parse(payload);
        if (document.RootElement.TryGetProperty("canvas", out var canvas)) { var raw = canvas.GetRawText(); var parsed = CanvasParser.Parse(raw); return new("", raw, false, null); }
        if (document.RootElement.TryGetProperty("content", out var content)) {
            var message = new Message("assistant", content.GetString() ?? "") { OutputMode = "markdown" };
            CanvasPresentation.Normalize(message);
            string? original = null;
            if (document.RootElement.TryGetProperty("diagnostics", out var diagnostics) && diagnostics.TryGetProperty("originalResponse", out var source)) original = source.GetString();
            return new(message.Content, message.CanvasJson, true, original ?? message.OriginalResponse);
        }
        throw new InvalidDataException("Canvas-Antwort fehlt.");
    }
    private static void ValidateServer(Uri server)
    {
        if (server.Scheme != "https" && !(server.IsLoopback && server.Scheme == "http")) throw new InvalidOperationException("Bitte eine HTTPS-Worker-Adresse verwenden.");
    }
    public void Dispose() => http.Dispose();
}
