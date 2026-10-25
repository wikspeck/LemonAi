using System.Diagnostics;
using System.Text.Json;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
namespace Lemon2;
internal sealed class RenderBenchmarkWindow : Window
{
    private readonly StackPanel panel = new();
    public RenderBenchmarkWindow()
    {
        Content = new ScrollViewer { Content = panel };
        panel.Loaded += async (_, _) => { await RunAsync(); Application.Current.Exit(); };
    }
    private static T? Find<T>(DependencyObject node) where T:DependencyObject
    {
        if(node is T match)return match;
        for(var index=0;index<Microsoft.UI.Xaml.Media.VisualTreeHelper.GetChildrenCount(node);index++){
            var found=Find<T>(Microsoft.UI.Xaml.Media.VisualTreeHelper.GetChild(node,index));if(found is not null)return found;
        }
        return null;
    }
    private async Task RunAsync()
    {
        var samples = new List<object>();
        var view = new MessageView(); panel.Children.Add(view);
        var text = string.Join("\n", Enumerable.Range(0, 140).Select(i => $"Paragraph {i}: **important** content and `code` for a representative long answer."));
        var message = new Message("assistant", text) { OutputMode = "markdown" };
        // Use the same public control/data-binding path in both versions.
        for(var warmup=0;warmup<3;warmup++){ view.DataContext = new Message("assistant", "Warmup"); panel.UpdateLayout(); }
        var render = Stopwatch.StartNew();
        for(var index=0;index<25;index++){ view.DataContext = new Message("assistant", text) { OutputMode = "markdown" }; panel.UpdateLayout(); }
        samples.Add(new { metric="markdown_25_rebinds_ms", value=render.Elapsed.TotalMilliseconds, characters=text.Length });
        message.IsStreaming=true; view.DataContext=message; panel.UpdateLayout();
        var stream=Stopwatch.StartNew();
        for(var index=0;index<30;index++){message.Content += " continuation";await Task.Delay(55);panel.UpdateLayout();}
        samples.Add(new{metric="stream_30_updates_elapsed_ms",value=stream.Elapsed.TotalMilliseconds,scheduledDelayMs=1650});
        var latency=new List<double>();
        for(var index=0;index<20;index++){var timer=Stopwatch.StartNew();var completion=new TaskCompletionSource();DispatcherQueue.TryEnqueue(()=>completion.SetResult());await completion.Task;latency.Add(timer.Elapsed.TotalMilliseconds);}
        samples.Add(new{metric="dispatcher_queue_median_ms",value=latency.Order().ElementAt(latency.Count/2)});
        var canvas = new CanvasView(); panel.Children.Clear();panel.Children.Add(canvas);
        var json="{\"version\":1,\"title\":\"Benchmark\",\"components\":[{\"type\":\"slider\",\"label\":\"Value\",\"key\":\"value\",\"min\":0,\"max\":10,\"initial\":2},{\"type\":\"calculation\",\"label\":\"Double\",\"operation\":\"add\",\"inputs\":[\"value\",\"value\"]}]}";
        var draw=Stopwatch.StartNew();for(var index=0;index<40;index++){canvas.DataContext=new Message("assistant", ""){CanvasJson=json};panel.UpdateLayout();}
        samples.Add(new{metric="canvas_40_rebinds_ms",value=draw.Elapsed.TotalMilliseconds});
        samples.Add(new{metric="working_set_bytes",value=Process.GetCurrentProcess().WorkingSet64});
        samples.Add(new{metric="rasterization_scale",value=panel.XamlRoot.RasterizationScale});
        var stateA=new Message("assistant", ""){CanvasJson=json};stateA.NumericState["value"]=3;
        var stateB=new Message("assistant", ""){CanvasJson=json};stateB.NumericState["value"]=7;
        canvas.DataContext=stateA;panel.UpdateLayout();canvas.DataContext=stateB;panel.UpdateLayout();
        var slider=Find<Slider>(canvas)??throw new InvalidOperationException("Canvas slider missing");
        if(slider.Value!=7)throw new InvalidOperationException("Canvas state did not rebind");
        slider.Value=4;
        if(stateA.NumericState["value"]!=3||stateB.NumericState["value"]!=4)throw new InvalidOperationException("Canvas state leaked across messages");
        samples.Add(new{metric="canvas_state_rebinding_verified",value=1});
        var target=Environment.GetEnvironmentVariable("LEMON_BENCHMARK_OUTPUT");
        if(!string.IsNullOrWhiteSpace(target))await File.WriteAllTextAsync(target,JsonSerializer.Serialize(samples,new JsonSerializerOptions{WriteIndented=true}));
    }
}

