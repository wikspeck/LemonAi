using Microsoft.UI.Xaml;
namespace Lemon2;
public partial class App : Application
{
    private Window? window;
    public App() { InitializeComponent(); UnhandledException += (_, e) => RecordError(e.Exception); }
    private static void RecordError(Exception error)
    {
        try { var directory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Lemon2"); Directory.CreateDirectory(directory); File.WriteAllText(Path.Combine(directory, "last-error.txt"), "\n" + error + "\n" + string.Join("\n", error.Data.Keys.Cast<object>().Select(key => key + ": " + error.Data[key]))); } catch { }
    }
    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        try { window = new MainWindow(); window.Activate(); }
        catch (Exception error) { RecordError(error); throw; }
    }
}
