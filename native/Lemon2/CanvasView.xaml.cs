using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
namespace Lemon2;
public sealed partial class CanvasView : UserControl
{
    private Message? observed;
    public CanvasView() {
        InitializeComponent();
        DataContextChanged += (_, _) => { Detach(); observed = DataContext as Message; Attach(); Render(); };
        Loaded += (_, _) => { Detach(); Attach(); Render(); };
        Unloaded += (_, _) => Detach();
    }
    private void Attach() { if (observed is not null) observed.PropertyChanged += Changed; }
    private void Detach() { if (observed is not null) observed.PropertyChanged -= Changed; }
    private void Changed(object? sender, System.ComponentModel.PropertyChangedEventArgs e) { if (e.PropertyName == nameof(Message.CanvasJson)) Render(); }
    private Message? renderedMessage;
    private string? renderedSource;
    private bool rebinding;
    private readonly List<(CanvasComponent Component, Slider Control)> sliders = [];
    private readonly List<(CanvasComponent Component, CheckBox Control)> checks = [];
    private readonly List<(CanvasComponent Component, TextBlock Output)> calculations = [];
    private void UpdateCalculations() {
        if(renderedMessage is null)return;
        foreach(var (component,output) in calculations) output.Text=$"{component.Label}: {CanvasParser.Calculate(component,renderedMessage.NumericState):G6}";
    }
    private void BindState(Message message) {
        rebinding=true;
        try {
            foreach(var (component,control) in sliders) {
                if(!message.NumericState.TryGetValue(component.Key!,out var value)||!double.IsFinite(value)||value<component.Min||value>component.Max)value=component.InitialNumber;
                message.NumericState[component.Key!]=value;control.Value=value;
            }
            foreach(var (component,control) in checks)control.IsChecked=message.BooleanState.GetValueOrDefault(component.Key!,component.InitialBoolean);
            UpdateCalculations();
        }finally{rebinding=false;}
    }
    private void Render()
    {
        if (DataContext is not Message message || message.CanvasJson is null) { Visibility=Visibility.Collapsed;Panel.Children.Clear(); sliders.Clear(); checks.Clear(); calculations.Clear(); renderedSource=null; renderedMessage = null; return; }
        Visibility=Visibility.Visible;
        if(renderedSource==message.CanvasJson && renderedMessage is not null){renderedMessage=message;BindState(message);return;}
        renderedMessage = message; renderedSource = message.CanvasJson;
        Panel.Children.Clear();sliders.Clear();checks.Clear();calculations.Clear();
        try
        {
            var document = message.GetCanvasDocument();
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
                        check.Checked += (_, _) => { if(rebinding||renderedMessage is null)return;renderedMessage.BooleanState[component.Key!] = true; renderedMessage.NotifyStateChanged(); };
                        check.Unchecked += (_, _) => { if(rebinding||renderedMessage is null)return;renderedMessage.BooleanState[component.Key!] = false; renderedMessage.NotifyStateChanged(); };
                        checks.Add((component,check));Panel.Children.Add(check); break;
                    case "slider":
                        var slider = new Slider { Header = new TextBlock { Text = component.Label, TextWrapping = TextWrapping.Wrap }, Minimum = component.Min, Maximum = component.Max, Value = message.NumericState[component.Key!], StepFrequency = Math.Max((component.Max - component.Min) / 100, 0.00001), HorizontalAlignment = HorizontalAlignment.Stretch };
                        slider.ValueChanged += (_, e) => { if(rebinding||renderedMessage is null)return;renderedMessage.NumericState[component.Key!] = e.NewValue; UpdateCalculations(); renderedMessage.NotifyStateChanged(); };
                        sliders.Add((component,slider));Panel.Children.Add(slider); break;
                    case "calculation": var output = new TextBlock { TextWrapping = TextWrapping.Wrap, FontSize = 18 }; calculations.Add((component, output)); Panel.Children.Add(output); break;
                }
            }
            BindState(message);
        }
        catch (Exception) { Panel.Children.Clear(); Panel.Children.Add(new TextBlock { Text = L.T("CanvasError"), TextWrapping = TextWrapping.Wrap }); }
    }
}
