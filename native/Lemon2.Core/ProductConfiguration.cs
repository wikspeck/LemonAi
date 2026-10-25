namespace Lemon2;
public static class ProductConfiguration
{
    public const string Version = "2.2.0";
    public static Uri ApiBaseUri
    {
        get
        {
#if DEBUG
            var configured = Environment.GetEnvironmentVariable("LEMON_API_BASE_URL");
            if (Uri.TryCreate(configured, UriKind.Absolute, out var uri) && (uri.Scheme == "https" || uri.Scheme == "http" && uri.IsLoopback)) return uri;
#endif
            return new("https://lemonai.wik-speck.workers.dev/");
        }
    }
}
public sealed record CanvasReply(string Content, string? CanvasJson, bool Fallback, string? OriginalResponse);
public static class CanvasPresentation
{
    public static void Normalize(Message message)
    {
        if (message.Role != "assistant") return;
        if (message.CanvasJson is not null) {
            try { message.GetCanvasDocument(); return; }
            catch { message.OriginalResponse ??= message.CanvasJson; message.Content = message.CanvasJson; message.CanvasJson = null; }
        }
        var raw = message.Content.Trim().TrimStart('\uFEFF');
        if (raw.StartsWith("```json", StringComparison.OrdinalIgnoreCase) && raw.EndsWith("```")) raw = raw[7..^3].Trim();
        var marker = raw.IndexOf("\"components\"", StringComparison.Ordinal);
        if (marker < 0) return;
        var beginning = raw.LastIndexOf('{', marker);
        if (beginning < 0) return;
        var prefix = raw[..beginning].Replace("```json", "").Trim();
        var suffix = "";
        var candidate = raw[beginning..];
        try
        {
            var bytes = System.Text.Encoding.UTF8.GetBytes(candidate);
            var reader = new System.Text.Json.Utf8JsonReader(bytes, new System.Text.Json.JsonReaderOptions { MaxDepth = 16 });
            using var document = System.Text.Json.JsonDocument.ParseValue(ref reader);
            suffix = System.Text.Encoding.UTF8.GetString(bytes.AsSpan((int)reader.BytesConsumed)).Trim().Trim('`').Trim();
            candidate = document.RootElement.GetRawText();
        }
        catch { /* Recover complete content fields from truncated structures below. */ }
        raw = candidate;        message.OriginalResponse ??= message.Content;
        try { var canvas = CanvasParser.Parse(raw); message.CanvasJson = raw; message.Content = string.Join("\n\n", new[] { prefix, suffix }.Where(value => value.Length > 0)); }
        catch
        {
            var fragments = new List<string>();
            foreach (System.Text.RegularExpressions.Match match in System.Text.RegularExpressions.Regex.Matches(raw, "\\\"(?:text|title|label|content|markdown)\\\"\\s*:\\s*(\\\"(?:[^\\\"\\\\]|\\\\.)*\\\")"))
            {
                try { var value = System.Text.Json.JsonSerializer.Deserialize<string>(match.Groups[1].Value); if (!string.IsNullOrWhiteSpace(value)) fragments.Add(value); } catch { }
                if (fragments.Count >= 64) break;
            }
            message.Content = fragments.Count > 0 ? string.Join("\n\n", new[] { prefix }.Concat(fragments.Distinct()).Append(suffix).Where(value => value.Length > 0)) : L.T("CanvasError");
            message.OutputMode = "markdown";
        }
    }
}
