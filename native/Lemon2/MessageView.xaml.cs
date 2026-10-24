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
    private Message? message;
    public MessageView()
    {
        InitializeComponent();
        DataContextChanged += (_, _) => { if (message is not null) message.PropertyChanged -= Changed; message = DataContext as Message; if (message is not null) message.PropertyChanged += Changed; Render(); };
        Unloaded += (_, _) => { if (message is not null) message.PropertyChanged -= Changed; };
        Loaded += (_, _) => { if (message is not null) { message.PropertyChanged -= Changed; message.PropertyChanged += Changed; Render(); } };
    }
    private void Changed(object? sender, PropertyChangedEventArgs e) => Render();
    private void Render()
    {
        Text.Blocks.Clear(); if (message is null) return;
        if (message.OutputMode != "markdown") { var paragraph = new Paragraph(); paragraph.Inlines.Add(new Run { Text = message.Content }); Text.Blocks.Add(paragraph); return; }
        var code = false;
        foreach (var line in message.Content.Replace("\r", "").Split('\n'))
        {
            if (line.StartsWith("```")) { code = !code; continue; }
            var paragraph = new Paragraph { Margin = new Thickness(0, 0, 0, 6) };
            if (code) { paragraph.Inlines.Add(new Run { Text = line, FontFamily = new FontFamily("Consolas") }); }
            else
            {
                var heading = Regex.Match(line, @"^(#{1,6})\s+(.+)$");
                var content = heading.Success ? heading.Groups[2].Value : line;
                if (heading.Success) { paragraph.FontSize = 24 - heading.Groups[1].Length; paragraph.FontWeight = Microsoft.UI.Text.FontWeights.SemiBold; }
                if (content.StartsWith("- ") || content.StartsWith("* ")) content = "• " + content[2..];
                foreach (var part in Regex.Split(content, @"(\*\*[^*]+\*\*|`[^`]+`)").Where(part => part.Length > 0))
                {
                    var run = new Run { Text = part };
                    if (part.StartsWith("**") && part.EndsWith("**")) { run.Text = part[2..^2]; run.FontWeight = Microsoft.UI.Text.FontWeights.Bold; }
                    else if (part.StartsWith('`') && part.EndsWith('`')) { run.Text = part[1..^1]; run.FontFamily = new FontFamily("Consolas"); }
                    paragraph.Inlines.Add(run);
                }
            }
            Text.Blocks.Add(paragraph);
        }
    }
    private void Copy_Click(object sender, RoutedEventArgs e) { if (message is null) return; var data = new DataPackage(); data.SetText(message.CanvasJson ?? message.Content); Clipboard.SetContent(data); }
}
