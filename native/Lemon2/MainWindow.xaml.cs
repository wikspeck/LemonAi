using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Windows.System;
using Windows.UI.Core;
namespace Lemon2;
public sealed partial class MainWindow : Window
{
    private readonly ChatService service = new();
    private readonly ConversationStore store = new();
    private List<Conversation> conversations = [];
    private Conversation? active;
    private ModelCatalogue? catalogue;
    private CancellationTokenSource? generation;
    private bool storageHealthy;
    public MainWindow()
    {
        InitializeComponent();
        Root.KeyDown += async (_, e) => { var control = Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(VirtualKey.Control).HasFlag(CoreVirtualKeyStates.Down); if (control && e.Key == VirtualKey.N && generation is null) { e.Handled = true; await NewChatAsync(); } else if (e.Key == VirtualKey.Escape) generation?.Cancel(); };
        AppWindow.Resize(new Windows.Graphics.SizeInt32(1100, 850));
        Root.Loaded += async (_, _) => await LoadAsync();
        Closed += (_, _) => { generation?.Cancel(); service.Dispose(); };
    }
    private async Task LoadAsync()
    {
        try { conversations = await store.LoadAsync(); storageHealthy = true; foreach (var message in conversations.SelectMany(c => c.Messages)) { CanvasPresentation.Normalize(message); message.StateChanged += PersistCanvasState; } if (conversations.Count == 0) CreateChat(); RefreshChats(); await InitializeConnectionAsync(); }
        catch (Exception e) { ShowError(e.Message); Send.IsEnabled = false; New.IsEnabled = false; }
    }
    private static string Selection(ComboBox combo) => (string)((ComboBoxItem)combo.SelectedItem).Tag;
    private GenerationConfig Configuration() => new(Selection(Tier), Selection(Effort), Selection(OutputMode));
    private async void Connect_Click(object sender, RoutedEventArgs e) => await InitializeConnectionAsync();
    private bool connecting;
    private async Task InitializeConnectionAsync()
    {
        if (connecting) return;
        connecting = true; ConnectButton.IsEnabled = false; Send.IsEnabled = false; ConnectionLabel.Text = "Verbindung wird hergestellt …";
        try
        {
            Exception? last = null;
            for (var attempt = 0; attempt < 2; attempt++)
            {
                try { using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(12)); catalogue = await service.GetModelsAsync(ProductConfiguration.ApiBaseUri, timeout.Token); last = null; break; }
                catch (Exception error) { last = error; if (attempt == 0) await Task.Delay(700); }
            }
            if (last is not null) throw last;
            PopulateModels(); Status.IsOpen = false; ConnectionLabel.Text = "Bereit für deine nächste Idee"; Send.IsEnabled = storageHealthy;
        }
        catch { catalogue = null; Model.ItemsSource = null; ShowError("Lemon ist gerade nicht erreichbar. Prüfe deine Internetverbindung und versuche es erneut."); ConnectionLabel.Text = "Offline · Deine Chats bleiben gespeichert"; }
        finally { connecting = false; ConnectButton.IsEnabled = true; }
    }
    private void Model_SelectionChanged(object sender, SelectionChangedEventArgs e) { if (ModelSummary is not null && Model.SelectedItem is ModelEntry model) ModelSummary.Content = $"Lemon 2.1 · {model.Name}  ⌄"; }
    private void Sidebar_Click(object sender, RoutedEventArgs e) => Shell.IsPaneOpen = !Shell.IsPaneOpen;
    private void Root_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        if (Shell is null) return;
        var wide = e.NewSize.Width >= 900;
        Shell.DisplayMode = wide ? SplitViewDisplayMode.Inline : SplitViewDisplayMode.Overlay;
        if (wide != lastWide) { Shell.IsPaneOpen = wide; lastWide = wide; }
    }
    private bool lastWide = true;
    private async void Settings_Click(object sender, RoutedEventArgs e)
    {
        var panel = new StackPanel { Spacing = 14 };
        panel.Children.Add(new TextBlock { Text = "Lemon 2.1\nDeine Gespräche werden auf diesem Gerät gespeichert. Antworten werden mit Cloudflare Workers AI erzeugt.", TextWrapping = TextWrapping.Wrap });
        panel.Children.Add(new HyperlinkButton { Content = "Neuigkeiten & Versionsgeschichte", NavigateUri = new Uri(ProductConfiguration.ApiBaseUri, "/changelog") });
        panel.Children.Add(new HyperlinkButton { Content = "Produktwebsite & Downloads", NavigateUri = ProductConfiguration.ApiBaseUri });
        await new ContentDialog { XamlRoot = Root.XamlRoot, Title = "Über Lemon", Content = panel, CloseButtonText = "Schließen", RequestedTheme = Root.ActualTheme }.ShowAsync();
    }    private void Tier_SelectionChanged(object sender, SelectionChangedEventArgs e) { if (catalogue is not null) PopulateModels(); }
    private void PopulateModels()
    {
        if (catalogue is null) return;
        var tier = Selection(Tier);
        var models = catalogue.Models.Where(m => m.Enabled && m.Tier == tier).ToList();
        Model.ItemsSource = models;
        Model.SelectedItem = models.Find(m => m.Id == active?.Model) ?? models.Find(m => m.Id == catalogue.TierDefaults.GetValueOrDefault(tier)) ?? models.FirstOrDefault();
    }
    private void RefreshChats() { Chats.ItemsSource = null; Chats.ItemsSource = conversations.Where(c => c.Title.Contains(Search.Text, StringComparison.OrdinalIgnoreCase) || c.Messages.Any(m => m.Content.Contains(Search.Text, StringComparison.OrdinalIgnoreCase))).ToList(); Chats.SelectedItem = active ?? conversations.FirstOrDefault(); }
    private void CreateChat() { active = new(Guid.NewGuid().ToString(), "Neuer Chat", "", [], Configuration()); conversations.Insert(0, active); }
    private void Chats_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (Chats.SelectedItem is not Conversation chat) return;
        active = chat; Messages.ItemsSource = chat.Messages; Welcome.Visibility = chat.Messages.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        var config = chat.Configuration ?? new();
        Select(Tier, config.Tier); Select(Effort, config.Effort); Select(OutputMode, config.OutputMode); PopulateModels();
    }
    private static void Select(ComboBox combo, string value) { foreach (ComboBoxItem item in combo.Items) if ((string)item.Tag == value) combo.SelectedItem = item; }
    private async void New_Click(object sender, RoutedEventArgs e) => await NewChatAsync();
    private async Task NewChatAsync() { await SaveAsync(); CreateChat(); RefreshChats(); if (Shell.DisplayMode == SplitViewDisplayMode.Overlay) Shell.IsPaneOpen = false; await SaveAsync(); Composer.Focus(FocusState.Programmatic); }
    private async Task SaveAsync() { if (!storageHealthy) return; try { await store.SaveAsync(conversations); } catch (Exception e) { ShowError("Speichern fehlgeschlagen: " + e.Message); } }
    private void Theme_Click(object sender, RoutedEventArgs e) => Root.RequestedTheme = Root.ActualTheme == ElementTheme.Dark ? ElementTheme.Light : ElementTheme.Dark;
    private void Stop_Click(object sender, RoutedEventArgs e) => generation?.Cancel();
    private async void Send_Click(object sender, RoutedEventArgs e) => await SendAsync();
    private async void Composer_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        var shift = Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(VirtualKey.Shift).HasFlag(CoreVirtualKeyStates.Down);
        if (e.Key == VirtualKey.Enter && !shift) { e.Handled = true; await SendAsync(); }
    }
    private void ShowError(string message) { Status.Severity = InfoBarSeverity.Error; Status.Message = message; Status.IsOpen = true; }
    private async Task SendAsync(bool regenerate = false)
    {
        if (active is null || generation is not null || (!regenerate && string.IsNullOrWhiteSpace(Composer.Text)) || !storageHealthy) return;
        var endpoint = ProductConfiguration.ApiBaseUri;
        if (Model.SelectedItem is not ModelEntry selected) { ShowError("Lemon ist noch nicht verbunden. Bitte versuche es gleich erneut."); return; }
        var chat = active; var text = regenerate ? chat.Messages.LastOrDefault(m => m.Role == "user")?.Content ?? "" : Composer.Text.Trim(); var config = Configuration();
        if (text.Length == 0) return;
        var updated = chat with { Model = selected.Id, Configuration = config, Title = chat.Messages.Count == 0 ? text[..Math.Min(48, text.Length)] : chat.Title };
        conversations[conversations.IndexOf(chat)] = updated; active = updated; chat = updated;
        var previousReply = regenerate && chat.Messages.LastOrDefault()?.Role == "assistant" ? chat.Messages.Last() : null;
        if (!regenerate) chat.Messages.Add(new("user", text));
        var history = chat.Messages.Where(m => m != previousReply && !string.IsNullOrWhiteSpace(m.Content)).ToList();
        var reply = new Message("assistant", "") { OutputMode = config.OutputMode }; chat.Messages.Add(reply); reply.StateChanged += PersistCanvasState; Composer.Text = "";
        generation = new CancellationTokenSource(TimeSpan.FromMinutes(3));
        SetBusy(true);
        Status.IsOpen = false; ConnectionLabel.Text = "Lemon antwortet …";
        RefreshChats(); Welcome.Visibility = Visibility.Collapsed;
        try
        {
            if (config.OutputMode == "canvas")
            {
                var result = await service.GenerateCanvasAsync(endpoint!, selected.Id, history, config, generation.Token);
                reply.CanvasJson = result.CanvasJson; reply.Content = result.Content; reply.OriginalResponse = result.OriginalResponse; reply.OutputMode = result.Fallback ? "markdown" : "canvas"; CanvasPresentation.Normalize(reply);
                Status.IsOpen = result.Fallback; Status.Message = "Die Antwort wird als Text angezeigt, weil die interaktive Ansicht nicht verfügbar war.";
            }
            else
            {
                await foreach (var delta in service.StreamAsync(endpoint!, selected.Id, history, generation.Token, config))
                {
                    if (reply.Content.Length + delta.Length > 1_000_000) throw new InvalidDataException("Antwort ist zu groß.");
                    reply.Content += delta;
                }
                Status.Message = reply.Content.Length == 0 ? "Leere Antwort empfangen." : $"Antwort von {selected.Name} abgeschlossen.";
            }
        }
        catch (OperationCanceledException) { Status.Message = "Generierung angehalten. Bisheriger Text bleibt erhalten."; }
        catch (Exception) { ShowError("Die Antwort konnte nicht abgeschlossen werden. Dein bisheriger Text bleibt erhalten. Bitte versuche es erneut."); }
        finally
        {
            if (reply.Content.Length == 0) chat.Messages.Remove(reply);
            else if (previousReply is not null) chat.Messages.Remove(previousReply);
            generation.Dispose(); generation = null; SetBusy(false); ConnectionLabel.Text = "Bereit für deine nächste Idee";
            CanvasPresentation.Normalize(reply);
            Messages.ItemsSource = null; Messages.ItemsSource = chat.Messages;
            await SaveAsync();
            if (chat.Messages.Count > 0) Messages.ScrollIntoView(chat.Messages.Last());
            Composer.Focus(FocusState.Programmatic);
        }
    }
    private async void PersistCanvasState() => await SaveAsync();
    private void Search_TextChanged(object sender, TextChangedEventArgs e) { if (storageHealthy) RefreshChats(); }
    private async void Rename_Click(object sender, RoutedEventArgs e)
    {
        if (active is null || generation is not null) return;
        var input = new TextBox { Text = active.Title, MaxLength = 160 };
        var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, Title = "Chat umbenennen", Content = input, PrimaryButtonText = "Speichern", CloseButtonText = "Abbrechen" };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary || string.IsNullOrWhiteSpace(input.Text)) return;
        var updated = active with { Title = input.Text.Trim() }; conversations[conversations.IndexOf(active)] = updated; active = updated; RefreshChats(); await SaveAsync();
    }
    private async void Delete_Click(object sender, RoutedEventArgs e)
    {
        if (active is null || generation is not null) return;
        var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, Title = "Chat löschen?", Content = active.Title, PrimaryButtonText = "Löschen", CloseButtonText = "Abbrechen" };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
        conversations.Remove(active); active = conversations.FirstOrDefault(); if (active is null) CreateChat(); RefreshChats(); await SaveAsync();
    }
    private async void Regenerate_Click(object sender, RoutedEventArgs e)
    {
        if (active is null || generation is not null || active.Messages.All(m => m.Role != "user")) return;
        await SendAsync(true);
    }
    private void SetBusy(bool busy)
    {
        Regenerate.IsEnabled = Search.IsEnabled = Send.IsEnabled = New.IsEnabled = Chats.IsEnabled = Model.IsEnabled = ConnectButton.IsEnabled = Tier.IsEnabled = Effort.IsEnabled = OutputMode.IsEnabled = !busy;
        Stop.IsEnabled = busy; Stop.Visibility = busy ? Visibility.Visible : Visibility.Collapsed;
        Send.Visibility = busy ? Visibility.Collapsed : Visibility.Visible;
        Send.IsEnabled = !busy && catalogue is not null && storageHealthy;
    }
}
