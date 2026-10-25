using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Documents;
using Microsoft.UI.Xaml.Media;
using System.ComponentModel;
using System.Text.RegularExpressions;
using Windows.ApplicationModel.DataTransfer;
namespace Lemon2;
public sealed partial class MessageView : UserControl
{
    public UiStrings Strings { get; } = (UiStrings)Application.Current.Resources["Strings"];
    private Message? message;
    private Message? renderedMessage;
    private string? renderedContent, renderedCanvas;
    private bool renderedStreaming;
    private string? renderedStyle;
    private TextBlock? streamingText;
    private StackPanel? streamingPanel;
    private void AppendStreamingText(string content)
    {
        if(streamingPanel is null||streamingText is null)return;
        var lines=content.Replace("\r", "").Split('\n');
        for(var index=0;index<lines.Length;index++){
            if(index>0 && streamingPanel.Children.Count<512){streamingText=StreamLine();streamingPanel.Children.Add(streamingText);}
            else if(index>0)streamingText.Text+="\n";
            streamingText.Text+=lines[index];
        }
    }
    private static TextBlock StreamLine() => new(){TextWrapping=TextWrapping.Wrap,IsTextSelectionEnabled=true,FontSize=16,LineHeight=26,MinHeight=26};
    private readonly DispatcherTimer timer = new() { Interval = TimeSpan.FromMilliseconds(45) };
    public MessageView()
    {
        InitializeComponent(); timer.Tick += (_, _) => { timer.Stop(); Render(); };
        DataContextChanged += (_, _) => { if (message is not null) message.PropertyChanged -= Changed; message = DataContext as Message; if (message is not null) message.PropertyChanged += Changed; Render(); };
        Unloaded += (_, _) => { timer.Stop(); if (message is not null) message.PropertyChanged -= Changed; };
        Loaded += (_, _) => { if (message is not null) { message.PropertyChanged -= Changed; message.PropertyChanged += Changed; Render(); } };
    }
    private void Changed(object? sender, PropertyChangedEventArgs e) { if (!timer.IsEnabled) timer.Start(); }
    private RichTextBlock Rich(string content, double size = 16)
    {
        var block = new RichTextBlock { IsTextSelectionEnabled = true, TextWrapping = TextWrapping.Wrap, FontSize = size, LineHeight = size * 1.65 };
        var paragraph = new Paragraph();
        foreach (var part in Regex.Split(content, @"(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?://[^\s)]+\))").Where(part => part.Length > 0))
        {
            var link = Regex.Match(part, @"^\[([^\]]+)\]\((https?://[^\s)]+)\)$");
            if (link.Success && Uri.TryCreate(link.Groups[2].Value, UriKind.Absolute, out var uri)) { var hyperlink = new Hyperlink { NavigateUri = uri }; hyperlink.Inlines.Add(new Run { Text = link.Groups[1].Value }); paragraph.Inlines.Add(hyperlink); continue; }
            var run = new Run { Text = part };
            if (part.StartsWith("**") && part.EndsWith("**")) { run.Text = part[2..^2]; run.FontWeight = Microsoft.UI.Text.FontWeights.SemiBold; }
            else if (part.StartsWith('`') && part.EndsWith('`')) { run.Text = part[1..^1]; run.FontFamily = new FontFamily("Cascadia Mono, Consolas"); }
            paragraph.Inlines.Add(run);
        }
        block.Blocks.Add(paragraph); return block;
    }
    private void Render()
    {
        if (message is null) { Body.Children.Clear(); renderedMessage = null; renderedContent = null; renderedCanvas = null; return; }
        var style = message.Role + ":" + message.OutputMode + ":" + L.Language;
        CopyButton.Content = L.T("Copy");
        if (renderedMessage is not null && renderedContent == message.Content && renderedCanvas == message.CanvasJson && renderedStreaming == message.IsStreaming && renderedStyle == style) { renderedMessage = message; return; }
        if(message.IsStreaming && ReferenceEquals(renderedMessage,message) && streamingPanel is not null && renderedContent is not null && message.Content.StartsWith(renderedContent,StringComparison.Ordinal)){AppendStreamingText(message.Content[renderedContent.Length..]);renderedContent=message.Content;return;}
        renderedMessage = message; renderedContent = message.Content; renderedCanvas = message.CanvasJson; renderedStreaming = message.IsStreaming; renderedStyle = style;
        Body.Children.Clear(); streamingText = null; streamingPanel=null;
        if(message.IsStreaming){streamingPanel=new StackPanel{Spacing=0};streamingText=StreamLine();streamingPanel.Children.Add(streamingText);Body.Children.Add(streamingPanel);AppendStreamingText(message.Content);return;}
        CopyButton.Visibility = message.Content.Length > 0 || message.CanvasJson is not null ? Visibility.Visible : Visibility.Collapsed;
        if (message.CanvasJson is not null && message.Content.Length == 0) return;
        if (message.OutputMode == "text" || message.Role == "user") { Body.Children.Add(new TextBlock { Text = message.Content, TextWrapping = TextWrapping.Wrap, IsTextSelectionEnabled = true, FontSize = 16, LineHeight = 26 }); return; }
        var lines = message.Content.Replace("\r", "").Split('\n');
        for (var index = 0; index < lines.Length; index++)
        {
            var line = lines[index];
            if (line.StartsWith("```"))
            {
                var language = line[3..].Trim(); var code = new List<string>();
                while (++index < lines.Length && !lines[index].StartsWith("```")) code.Add(lines[index]);
                var source = string.Join('\n', code);
                var panel = new StackPanel { Spacing = 10 };
                var heading = new Grid(); heading.ColumnDefinitions.Add(new() { Width = new GridLength(1, GridUnitType.Star) }); heading.ColumnDefinitions.Add(new() { Width = GridLength.Auto });
                heading.Children.Add(new TextBlock { Text = string.IsNullOrEmpty(language) ? L.T("Code") : language, Opacity = .65, FontSize = 12 });
                var copy = new Button { Content = L.T("CopyCode"), FontSize = 12, Padding = new Thickness(8, 3, 8, 3) }; copy.Click += (_, _) => Copy(source); Grid.SetColumn(copy, 1); heading.Children.Add(copy); panel.Children.Add(heading);
                panel.Children.Add(new TextBlock { Text = source, FontFamily = new FontFamily("Cascadia Mono, Consolas"), FontSize = 14, TextWrapping = TextWrapping.Wrap, IsTextSelectionEnabled = true });
                Body.Children.Add(new Border { Style = (Style)Application.Current.Resources["LemonCodeBlock"], Child = panel }); continue;
            }
            if (index + 1 < lines.Length && line.Contains('|') && Regex.IsMatch(lines[index + 1], @"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$"))
            {
                var rows = new List<string[]> { Cells(line) }; index++;
                while (index + 1 < lines.Length && lines[index + 1].Contains('|')) rows.Add(Cells(lines[++index]));
                var columns = rows.Max(row => row.Length); var table = new Grid { ColumnSpacing = 12, RowSpacing = 10 };
                for (var column = 0; column < columns; column++) table.ColumnDefinitions.Add(new() { Width = new GridLength(1, GridUnitType.Star) });
                for (var row = 0; row < rows.Count; row++)
                {
                    table.RowDefinitions.Add(new() { Height = GridLength.Auto });
                    for (var column = 0; column < rows[row].Length; column++) { var cell = Rich(rows[row][column], 14); if (row == 0) cell.FontWeight = Microsoft.UI.Text.FontWeights.SemiBold; Grid.SetRow(cell, row); Grid.SetColumn(cell, column); table.Children.Add(cell); }
                }
                Body.Children.Add(table); continue;
            }
            if (string.IsNullOrWhiteSpace(line)) continue;
            var headingMatch = Regex.Match(line, @"^(#{1,6})\s+(.+)$");
            if (headingMatch.Success) { var heading = Rich(headingMatch.Groups[2].Value, 27 - headingMatch.Groups[1].Length * 1.5); heading.FontWeight = Microsoft.UI.Text.FontWeights.SemiBold; Body.Children.Add(heading); continue; }
            if (line.StartsWith("- ") || line.StartsWith("* ")) line = "•  " + line[2..];
            if (line.StartsWith("> ")) line = "❝  " + line[2..];
            // Readable native notation for common inline/display math; never execute generated formulas.
            if (line.Contains('$') || line.Contains(@"\[")) line = line.Replace("$$", "").Replace("$", "").Replace(@"\[", "").Replace(@"\]", "").Replace(@"\times", "×").Replace(@"\cdot", "·").Replace(@"\leq", "≤").Replace(@"\geq", "≥").Replace(@"\pi", "π").Replace(@"\infty", "∞");
            Body.Children.Add(Rich(line));
        }
    }
    private static string[] Cells(string line) => line.Trim().Trim('|').Split('|').Select(cell => cell.Trim()).Take(12).ToArray();
    private static void Copy(string content) { try { var data = new DataPackage(); data.SetText(content); Clipboard.SetContent(data); } catch { } }
    private void Copy_Click(object sender, RoutedEventArgs e) { if (message is not null) Copy(message.Content.Length > 0 ? message.Content : message.GetCanvasDocument().Title); }
}
