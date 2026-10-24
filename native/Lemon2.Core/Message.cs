using System.ComponentModel;
namespace Lemon2;
public sealed class Message : INotifyPropertyChanged
{
    public string Role { get; init; }
    public string DisplayRole => Role == "user" ? "Du" : "Lemon";
    private string content;
    public string Content { get => content; set { content = value; PropertyChanged?.Invoke(this, new(nameof(Content))); } }
    public Message(string role, string content) { Role = role; this.content = content; }
    public string OutputMode { get; set; } = "text";
    private string? canvasJson;
    public string? CanvasJson { get => canvasJson; set { canvasJson = value; PropertyChanged?.Invoke(this, new(nameof(CanvasJson))); } }
    public string? OriginalResponse { get; set; }
    public Dictionary<string,double> NumericState { get; set; } = [];
    public Dictionary<string,bool> BooleanState { get; set; } = [];
    public event Action? StateChanged;
    public void NotifyStateChanged() => StateChanged?.Invoke();
    public event PropertyChangedEventHandler? PropertyChanged;
}
