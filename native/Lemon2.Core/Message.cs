using System.ComponentModel;
namespace Lemon2;
public sealed class Message : INotifyPropertyChanged
{
    private bool streaming;
    [System.Text.Json.Serialization.JsonIgnore]
    public bool IsStreaming { get => streaming; set { streaming = value; PropertyChanged?.Invoke(this, new(nameof(IsStreaming))); } }
    private string? parsedSource;
    private CanvasDocument? parsedCanvas;
    public CanvasDocument GetCanvasDocument()
    {
        if (CanvasJson is null) throw new InvalidDataException("No Canvas document.");
        if (parsedCanvas is null || parsedSource != CanvasJson) { parsedCanvas = CanvasParser.Parse(CanvasJson); parsedSource = CanvasJson; }
        return parsedCanvas;
    }
    public Message Snapshot() => new(Role, Content) { OutputMode = OutputMode, CanvasJson = CanvasJson, OriginalResponse = OriginalResponse, NumericState = new(NumericState), BooleanState = new(BooleanState) };
    public string Role { get; init; }
    public string DisplayRole => L.T(Role == "user" ? "You" : "Assistant");
    private string content;
    public string Content { get => content; set { content = value; PropertyChanged?.Invoke(this, new(nameof(Content))); } }
    public Message(string role, string content) { Role = role; this.content = content; }
    public string OutputMode { get; set; } = "text";
    private string? canvasJson;
    public string? CanvasJson { get => canvasJson; set { canvasJson = value; PropertyChanged?.Invoke(this, new(nameof(CanvasJson))); } }
    public string? OriginalResponse { get; set; }
    public Dictionary<string,double> NumericState { get; set; } = [];
    public Dictionary<string,bool> BooleanState { get; set; } = [];
    public void NotifyLanguageChanged() => PropertyChanged?.Invoke(this,new(nameof(DisplayRole)));
    public event Action? StateChanged;
    public void NotifyStateChanged() => StateChanged?.Invoke();
    public event PropertyChangedEventHandler? PropertyChanged;
}
