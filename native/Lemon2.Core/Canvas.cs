namespace Lemon2;
public sealed record GenerationConfig(string Tier = "zenith", string Effort = "medium", string OutputMode = "canvas");
public sealed record ModelEntry(string Id, string Name, string ApiId, string Family, string Tier, int Context, bool Enabled, string Availability);
public sealed record ModelCatalogue(int Version, List<ModelEntry> Models, Dictionary<string,string> TierDefaults);
public sealed record CanvasComponent(string Type, string? Text = null, string? Label = null, string? Key = null, double Min = 0, double Max = 0, double InitialNumber = 0, bool InitialBoolean = false, string? Operation = null, string[]? Inputs = null);
public sealed record CanvasDocument(string Title, List<CanvasComponent> Components);
public static class CanvasParser
{
    public static CanvasDocument Parse(string json)
    {
        if (json.Length > 1_000_000) throw new InvalidDataException("Canvas zu groß.");
        using var document = System.Text.Json.JsonDocument.Parse(json, new() { MaxDepth = 8 });
        var root = document.RootElement;
        Properties(root, "version", "title", "components");
        if (root.GetProperty("version").GetInt32() != 1) throw new InvalidDataException("Unbekannte Canvas-Version.");
        var title = Text(root, "title", 160);
        var nodes = root.GetProperty("components");
        if (nodes.GetArrayLength() is < 1 or > 64) throw new InvalidDataException("Zu viele Canvas-Komponenten.");
        List<CanvasComponent> result = []; HashSet<string> keys = []; HashSet<string> numeric = [];
        foreach (var node in nodes.EnumerateArray())
        {
            var type = Text(node, "type", 32);
            switch (type)
            {
                case "heading": case "paragraph": Properties(node, "type", "text"); result.Add(new(type, Text: Text(node, "text", 12000))); break;
                case "checkbox": case "slider":
                    Properties(node, type == "slider" ? ["type", "label", "key", "min", "max", "initial"] : ["type", "label", "key", "initial"]);
                    var key = Text(node, "key", 32);
                    if (!System.Text.RegularExpressions.Regex.IsMatch(key, "^[a-z][a-z0-9_]{0,31}$") || key is "constructor" or "prototype" or "__proto__" || !keys.Add(key)) throw new InvalidDataException("Ungültige Zustandsbindung.");
                    var label = Text(node, "label", 12000);
                    if (type == "checkbox") result.Add(new(type, Label: label, Key: key, InitialBoolean: node.GetProperty("initial").GetBoolean()));
                    else
                    {
                        var min = Number(node, "min"); var max = Number(node, "max"); var initial = Number(node, "initial");
                        if (min >= max || initial < min || initial > max || Math.Abs(min) > 1e9 || Math.Abs(max) > 1e9) throw new InvalidDataException("Ungültiger Schieberegler.");
                        numeric.Add(key); result.Add(new(type, Label: label, Key: key, Min: min, Max: max, InitialNumber: initial));
                    }
                    break;
                case "calculation":
                    Properties(node, "type", "label", "operation", "inputs");
                    var operation = Text(node, "operation", 16);
                    if (operation is not ("add" or "multiply")) throw new InvalidDataException("Unbekannte Rechenoperation.");
                    var inputs = node.GetProperty("inputs").EnumerateArray().Select(item => item.GetString() ?? "").ToArray();
                    if (inputs.Length is < 1 or > 8) throw new InvalidDataException("Ungültige Berechnung.");
                    result.Add(new(type, Label: Text(node, "label", 12000), Operation: operation, Inputs: inputs)); break;
                default: throw new InvalidDataException("Nicht unterstützte Canvas-Komponente.");
            }
        }
        if (result.Any(c => c.Type == "calculation" && c.Inputs!.Any(input => !numeric.Contains(input)))) throw new InvalidDataException("Unbekannte Berechnungsbindung.");
        return new(title, result);
    }
    public static double Calculate(CanvasComponent component, IReadOnlyDictionary<string,double> state)
    {
        if (component.Type != "calculation" || component.Operation is not ("add" or "multiply") || component.Inputs is null) throw new InvalidDataException("Ungültige Berechnung.");
        var value = component.Operation == "add" ? 0d : 1d;
        foreach (var input in component.Inputs) { var number = state[input]; value = component.Operation == "add" ? value + number : value * number; }
        if (!double.IsFinite(value)) throw new InvalidDataException("Ergebnis außerhalb des gültigen Bereichs.");
        return value;
    }
    private static void Properties(System.Text.Json.JsonElement node, params string[] allowed)
    {
        var names = node.EnumerateObject().Select(p => p.Name).ToArray();
        if (names.Distinct().Count() != names.Length || names.Length != allowed.Length || names.Any(name => !allowed.Contains(name))) throw new InvalidDataException("Unzulässige Canvas-Eigenschaft.");
    }
    private static string Text(System.Text.Json.JsonElement node, string property, int limit) { var value = node.GetProperty(property).GetString() ?? throw new InvalidDataException("Text fehlt."); if (value.Length > limit) throw new InvalidDataException("Text zu lang."); return value; }
    private static double Number(System.Text.Json.JsonElement node, string property) { var value = node.GetProperty(property).GetDouble(); if (!double.IsFinite(value)) throw new InvalidDataException("Ungültige Zahl."); return value; }
}
