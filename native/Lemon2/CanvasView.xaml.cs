using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
namespace Lemon2;
public sealed partial class CanvasView : UserControl
{
    public CanvasView() { InitializeComponent(); DataContextChanged += (_, _) => Render(); }
    private void Render()
    {
        Panel.Children.Clear();
        if (DataContext is not Message message || message.CanvasJson is null) return;
        try
        {
            var document = CanvasParser.Parse(message.CanvasJson);
            var calculations = new List<(CanvasComponent Component, TextBlock Output)>();
            void Update()
            {
                foreach (var (component, output) in calculations) output.Text = $"{component.Label}: {CanvasParser.Calculate(component, message.NumericState):G6}";
            }
            Panel.Children.Add(new TextBlock { Text = document.Title, FontSize = 22, TextWrapping = TextWrapping.Wrap });
            foreach (var component in document.Components.Where(c => c.Type == "slider"))
            {
                if (!message.NumericState.TryGetValue(component.Key!, out var value) || !double.IsFinite(value) || value < component.Min || value > component.Max) message.NumericState[component.Key!] = component.InitialNumber;
            }
            foreach (var component in document.Components)
            {
                switch (component.Type)
                {
                    case "heading": case "paragraph": Panel.Children.Add(new TextBlock { Text = component.Text, FontSize = component.Type == "heading" ? 20 : 15, TextWrapping = TextWrapping.Wrap, IsTextSelectionEnabled = true }); break;
                    case "checkbox":
                        var check = new CheckBox { Content = new TextBlock { Text = component.Label, TextWrapping = TextWrapping.Wrap }, HorizontalAlignment = HorizontalAlignment.Stretch, IsChecked = message.BooleanState.GetValueOrDefault(component.Key!, component.InitialBoolean) };
                        check.Checked += (_, _) => { message.BooleanState[component.Key!] = true; message.NotifyStateChanged(); };
                        check.Unchecked += (_, _) => { message.BooleanState[component.Key!] = false; message.NotifyStateChanged(); };
                        Panel.Children.Add(check); break;
                    case "slider":
                        var slider = new Slider { Header = new TextBlock { Text = component.Label, TextWrapping = TextWrapping.Wrap }, Minimum = component.Min, Maximum = component.Max, Value = message.NumericState[component.Key!], StepFrequency = Math.Max((component.Max - component.Min) / 100, 0.00001), HorizontalAlignment = HorizontalAlignment.Stretch };
                        slider.ValueChanged += (_, e) => { message.NumericState[component.Key!] = e.NewValue; Update(); message.NotifyStateChanged(); };
                        Panel.Children.Add(slider); break;
                    case "calculation": var output = new TextBlock { TextWrapping = TextWrapping.Wrap, FontSize = 18 }; calculations.Add((component, output)); Panel.Children.Add(output); break;
                }
            }
            Update();
        }
        catch (Exception) { Panel.Children.Clear(); Panel.Children.Add(new TextBlock { Text = "Diese Canvas-Antwort konnte nicht sicher dargestellt werden.", TextWrapping = TextWrapping.Wrap }); }
    }
}



