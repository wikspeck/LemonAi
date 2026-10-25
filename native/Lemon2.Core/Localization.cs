using System.ComponentModel;
using System.Text.Json;
namespace Lemon2;
public static class L
{
    private static string language = "en";
    private static Dictionary<string,string> words = Load("en");
    private static readonly Dictionary<string,string> English = Load("en");
    public static event Action? Changed;
    public static string Language => language;
    public static string T(string key) => words.GetValueOrDefault(key) ?? English.GetValueOrDefault(key) ?? key;
    public static void SetLanguage(string value) { var selected = value is "de" or "pl" ? value : "en"; if(selected == language)return;language=selected; words = Load(language); Changed?.Invoke(); }
    private static Dictionary<string,string> Load(string value)
    {
        using var stream = typeof(L).Assembly.GetManifestResourceStream($"Lemon2.Core.Localization.{value}.json") ?? throw new InvalidDataException("Missing localization resource: " + value);
        return JsonSerializer.Deserialize<Dictionary<string,string>>(stream)!;
    }
}
public sealed record AppSettings(int Version = 1, string Language = "en", string ResponseLanguage = "auto", string Theme = "system", int Width = 1240, int Height = 900, bool Maximized = false, bool Fullscreen = false);
public sealed class SettingsStore
{
    private readonly string path;
    private readonly SemaphoreSlim gate = new(1,1);
    public SettingsStore(string? path = null) => this.path = path ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Lemon2", "settings.json");
    public async Task<AppSettings> LoadAsync()
    {
        if (!File.Exists(path)) return new();
        var settings=JsonSerializer.Deserialize<AppSettings>(await File.ReadAllTextAsync(path)) ?? throw new InvalidDataException("Invalid settings");
        if(settings.Version != 1) throw new InvalidDataException("Unsupported settings version");
        return settings with { Width = Math.Clamp(settings.Width,640,7680), Height = Math.Clamp(settings.Height,480,4320), Language = settings.Language is "de" or "pl" ? settings.Language : "en", ResponseLanguage = settings.ResponseLanguage is "en" or "de" or "pl" ? settings.ResponseLanguage : "auto" };
    }
    public async Task SaveAsync(AppSettings settings)
    {
        await gate.WaitAsync();
        try { Directory.CreateDirectory(Path.GetDirectoryName(path)!); await File.WriteAllTextAsync(path+".tmp",JsonSerializer.Serialize(settings)); File.Move(path+".tmp",path,true); }
        finally { gate.Release(); }
    }
}
