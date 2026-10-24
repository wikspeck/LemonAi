using Lemon2;
using System.Net;
using System.Text;
using System.Text.Json;

var checks = 0;
void Check(bool condition, string name) { if (!condition) throw new Exception("FAIL: " + name); checks++; Console.WriteLine("PASS: " + name); }
async Task MustFail(Func<Task> action, string name) { try { await action(); } catch { Check(true, name); return; } throw new Exception("FAIL: " + name); }
async Task<string> Collect(ChatService service, string url = "https://example.test", CancellationToken token = default) { var result = ""; await foreach (var part in service.StreamAsync(new Uri(url), "test", [new("user", "hello")], token)) result += part; return result; }
var handler = new FakeHandler("data: {\"response\":\"Grüße\"}\r\n\r\ndata: {\"choices\":[{\"delta\":{\"content\":\"!\"},\"finish_reason\":null}]}\n\ndata: [DONE]\n\n");
using (var service = new ChatService(handler))
{
    Check(await Collect(service) == "Grüße!", "SSE formats and Unicode");
    using var request = JsonDocument.Parse(handler.Body!);
    Check(handler.Path == "/api/chat" && request.RootElement.GetProperty("messages")[0].GetProperty("role").GetString() == "user", "v1 API request contract");
    await MustFail(async () => { await Collect(service, "http://remote.test"); }, "reject insecure remote endpoint");
    using var canceled = new CancellationTokenSource(); canceled.Cancel();
    await MustFail(async () => { await Collect(service, token: canceled.Token); }, "cancellation");
}
foreach (var (data, name) in new[] { ("data: {\"response\":\"partial\"}\n", "detect truncated SSE"), ("data: {\"error\":\"bad\"}\n", "provider error"), ("data: malformed\n", "malformed event"), (new string('x', 1_000_002), "bound event length") })
{ using var service = new ChatService(new FakeHandler(data)); await MustFail(async () => { await Collect(service); }, name); }
using (var service = new ChatService(new FakeHandler("", HttpStatusCode.TooManyRequests))) await MustFail(async () => { await Collect(service); }, "HTTP quota failure");
var directory = Path.Combine(Path.GetTempPath(), "lemon2-checks-" + Guid.NewGuid());
Directory.CreateDirectory(directory);
try
{
    var path = Path.Combine(directory, "history.json"); var store = new ConversationStore(path);
    Check((await store.LoadAsync()).Count == 0, "empty history");
    await store.SaveAsync([new("1", "title", "model", [new("user", "hello"), new("assistant", "partial")])]);
    var restored = await store.LoadAsync();
    Check(restored[0].Messages[1].Content == "partial" && restored[0].Model == "model", "history roundtrip");
    await File.WriteAllTextAsync(path, "{\"Version\":99,\"Conversations\":[]}");
    await MustFail(async () => { await store.LoadAsync(); }, "reject unknown storage version");
    Check((await File.ReadAllTextAsync(path)).Contains("99"), "preserve unsupported history");
    await File.WriteAllTextAsync(path, "broken");
    await MustFail(async () => { await store.LoadAsync(); }, "corrupt history");
}
finally { Directory.Delete(directory, true); }
var message = new Message("assistant", ""); var notified = false; message.PropertyChanged += (_, e) => notified = e.PropertyName == "Content"; message.Content = "stream"; Check(notified, "incremental native message binding");
var canvasJson = """{"version":1,"title":"Calculator","components":[{"type":"slider","label":"Value","key":"value","min":0,"max":10,"initial":2},{"type":"calculation","label":"Double","operation":"add","inputs":["value","value"]}]}""";
var canvas = CanvasParser.Parse(canvasJson);
Check(CanvasParser.Calculate(canvas.Components[1], new Dictionary<string,double> { ["value"] = 3 }) == 6, "canvas arithmetic updates from state");
foreach (var invalid in new[] { canvasJson.Replace("\"initial\":2", "\"initial\":99"), canvasJson.Replace("\"value\",\"value\"", "\"missing\",\"value\""), canvasJson.Replace("\"slider\"", "\"xaml\""), canvasJson.Replace("\"label\":\"Value\"", "\"label\":\"Value\",\"onClick\":\"exec\"") })
    await MustFail(() => { CanvasParser.Parse(invalid); return Task.CompletedTask; }, "reject unsafe or invalid canvas");
var v2Handler = new FakeHandler("data: {\"response\":\"ok\"}\n\ndata: [DONE]\n\n");
using (var service = new ChatService(v2Handler))
{
    await foreach (var part in service.StreamAsync(new("https://example.test"), "qwen3", [new("user", "hello")], default, new("vortex", "high", "text"))) { }
    using var body = JsonDocument.Parse(v2Handler.Body!);
    Check(v2Handler.Path == "/api/v2/chat" && body.RootElement.GetProperty("engine").GetString() == "lemon2" && body.RootElement.GetProperty("effort").GetString() == "high", "v2 tier effort API contract");
}
var legacyCanvas = new Message("assistant", "```json\n" + canvasJson + "\n```"); CanvasPresentation.Normalize(legacyCanvas);
Check(legacyCanvas.CanvasJson is not null && legacyCanvas.Content == "", "legacy Canvas JSON rendered as Canvas");
var brokenCanvas = new Message("assistant", "{\"version\":1,\"components\":[{\"type\":\"unknown\",\"text\":\"Useful preserved text\"}]}"); CanvasPresentation.Normalize(brokenCanvas);
Check(brokenCanvas.Content.Contains("Useful preserved text") && !brokenCanvas.Content.Contains("components") && brokenCanvas.OriginalResponse is not null, "native malformed Canvas fallback preserves content and hides JSON");
Check(ProductConfiguration.ApiBaseUri.Scheme == "https", "built-in secure production endpoint");
var wrappedCanvas = new Message("assistant", "Introduction.\n" + canvasJson + "\nConclusion."); CanvasPresentation.Normalize(wrappedCanvas);
Check(wrappedCanvas.CanvasJson is not null && wrappedCanvas.Content.Contains("Introduction.") && wrappedCanvas.Content.Contains("Conclusion.") && !wrappedCanvas.Content.Contains("components"), "prose-wrapped Canvas preserves explanation without raw JSON");
Console.WriteLine($"{checks} checks passed.");
sealed class FakeHandler(string data, HttpStatusCode status = HttpStatusCode.OK) : HttpMessageHandler
{
    public string? Body; public string? Path;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    {
        token.ThrowIfCancellationRequested(); Body = await request.Content!.ReadAsStringAsync(token); Path = request.RequestUri!.AbsolutePath;
        return new(status) { Content = new StringContent(data, Encoding.UTF8, "text/event-stream") };
    }
}
