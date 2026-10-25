using System.Collections.ObjectModel;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Windows.System;
using Windows.UI.Core;
namespace Lemon2;
public sealed partial class MainWindow : Window
{
    public UiStrings Strings { get; } = (UiStrings)Application.Current.Resources["Strings"];
    private readonly OverlappedPresenter windowPresenter;
    private readonly ChatService service = new();
    private readonly ConversationStore store = new();
    private readonly SettingsStore settingsStore = new();
    private readonly RegistryCache registryCache = new(ProductConfiguration.ApiBaseUri);
    private readonly ObservableCollection<Message> visibleMessages = [];
    private List<Conversation> conversations = [];
    private Conversation? active;
    private ModelCatalogue? catalogue;
    private CancellationTokenSource? generation, searchDelay, saveDelay;
    private AppSettings settings = new();
    private bool settingsHealthy = true;
    private bool storageHealthy, connecting, closing, lastWide = true;
    private string? displayedId;
    public MainWindow()
    {
        InitializeComponent(); Messages.ItemsSource = visibleMessages;
        windowPresenter=(OverlappedPresenter)AppWindow.Presenter;windowPresenter.PreferredMinimumWidth=640;windowPresenter.PreferredMinimumHeight=480;
        if(!new Windows.UI.ViewManagement.UISettings().AnimationsEnabled) EffortIndicator.Transitions?.Clear();
        var icon = Path.Combine(AppContext.BaseDirectory,"Assets","lemon.ico"); if(File.Exists(icon))AppWindow.SetIcon(icon);
        Root.KeyDown += async (_,e) => {
            var control=Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(VirtualKey.Control).HasFlag(CoreVirtualKeyStates.Down);
            if(e.Key==VirtualKey.F11){ e.Handled=true;ToggleFullscreen(); }
            else if(control&&e.Key==VirtualKey.N&&generation is null){e.Handled=true;await NewChatAsync();}
            else if(e.Key==VirtualKey.Escape){if(AppWindow.Presenter.Kind==AppWindowPresenterKind.FullScreen)ToggleFullscreen();else generation?.Cancel();}
        };
        Root.Loaded += async (_,_) => await LoadAsync();
        AppWindow.Closing += async (_,args) => {
            if(closing)return;args.Cancel=true;closing=true;generation?.Cancel();saveDelay?.Cancel();searchDelay?.Cancel();
            await SaveAsync();await SaveSettingsAsync();Close();
        };
        Closed += (_,_) => {generation?.Cancel();service.Dispose();};
        Send.IsEnabled=false;
    }
    private async Task LoadAsync()
    {
        try {settings=await settingsStore.LoadAsync();}catch{settings=new();settingsHealthy=false;}
        L.SetLanguage(settings.Language);
        Root.RequestedTheme=settings.Theme=="dark"?ElementTheme.Dark:settings.Theme=="light"?ElementTheme.Light:ElementTheme.Default;
        AppWindow.Resize(new Windows.Graphics.SizeInt32(settings.Width,settings.Height));
        if(settings.Maximized&&AppWindow.Presenter is OverlappedPresenter presenter)presenter.Maximize();
        if(settings.Fullscreen)AppWindow.SetPresenter(AppWindowPresenterKind.FullScreen);
        try {
            conversations=await store.LoadAsync();storageHealthy=true;
            foreach(var message in conversations.SelectMany(chat=>chat.Messages))message.StateChanged+=PersistCanvasState;
            if(conversations.Count==0)CreateChat();RefreshChats();
        } catch {ShowError(L.T("StorageError"));New.IsEnabled=false;}
        await InitializeConnectionAsync();
        if(!settingsHealthy)ShowError(L.T("SettingsError"));
    }
    private static string Selection(ComboBox combo) => (string)((ComboBoxItem)combo.SelectedItem).Tag;
    private GenerationConfig Configuration() => new(Selection(Tier),Selection(Effort),Selection(OutputMode),settings.ResponseLanguage);
    private async void Connect_Click(object sender,RoutedEventArgs e)=>await InitializeConnectionAsync(true);
    private async Task InitializeConnectionAsync(bool force=false)
    {
        if(connecting)return;connecting=true;ConnectButton.IsEnabled=false;ConnectionLabel.Text=L.T("Connecting");
        try {
            catalogue=force?null:await registryCache.LoadAsync();
            if(catalogue is null){
                Exception? failure=null;
                for(var attempt=0;attempt<2;attempt++){
                    try{using var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(10));catalogue=await service.GetModelsAsync(ProductConfiguration.ApiBaseUri,timeout.Token);failure=null;break;}
                    catch(Exception error){failure=error;if(attempt==0)await Task.Delay(500);}
                }
                if(failure is not null)throw failure;
                try{await registryCache.SaveAsync(catalogue!);}catch{ }
            }
            PopulateModels();Status.IsOpen=false;ConnectionLabel.Text=L.T("Ready");Send.IsEnabled=storageHealthy;
        }catch{catalogue=null;Model.ItemsSource=null;Send.IsEnabled=false;ShowError(L.T("ConnectError"));ConnectionLabel.Text=L.T("Offline");}
        finally{connecting=false;ConnectButton.IsEnabled=true;}
    }
    private void PopulateModels()
    {
        if(catalogue is null)return;
        var tier=Selection(Tier);var models=catalogue.Models.Where(model=>model.Enabled&&model.Tier==tier).ToList();
        Model.ItemsSource=models;Model.SelectedItem=models.Find(model=>model.Id==active?.Model)??models.Find(model=>model.Id==catalogue.TierDefaults.GetValueOrDefault(tier))??models.FirstOrDefault();
        TierLabel.Text=tier switch{"vortex"=>"Vortex","apex"=>"Apex",_=>"Zenith"};
    }
    private void Model_SelectionChanged(object sender,SelectionChangedEventArgs e){if(ModelSummary is not null&&Model?.SelectedItem is ModelEntry model)ToolTipService.SetToolTip(ModelSummary,model.Name+" · "+model.Context.ToString("N0"));}
    private void Tier_SelectionChanged(object sender,SelectionChangedEventArgs e){if(catalogue is not null)PopulateModels();}
    private void EffortChoice_Click(object sender,RoutedEventArgs e){if(sender is Button button)Select(Effort,(string)button.Tag);}
    private void Effort_SelectionChanged(object sender,SelectionChangedEventArgs e)
    {
        if(EffortLabel is null||EffortIndicator is null||Effort?.SelectedItem is null)return;
        var choice=Selection(Effort);EffortLabel.Text=L.T(choice=="low"?"Low":choice=="high"?"High":"Medium");Grid.SetColumn(EffortIndicator,Effort.SelectedIndex);
    }
    private void Sidebar_Click(object sender,RoutedEventArgs e)=>Shell.IsPaneOpen=!Shell.IsPaneOpen;
    private void Root_SizeChanged(object sender,SizeChangedEventArgs e)
    {
        if(Shell is null)return;var wide=e.NewSize.Width>=1000;
        Shell.DisplayMode=wide?SplitViewDisplayMode.Inline:SplitViewDisplayMode.Overlay;
        if(wide!=lastWide){Shell.IsPaneOpen=wide;lastWide=wide;}
        if(EffortLabel is not null)EffortLabel.Visibility=e.NewSize.Width<560?Visibility.Collapsed:Visibility.Visible;
        ContentArea.Padding=e.NewSize.Width<560?new Thickness(12,8,12,8):new Thickness(24,12,24,12);
    }
    private void RefreshChats()
    {
        var query=Search.Text;Chats.ItemsSource=conversations.Where(chat=>query.Length==0||chat.Title.Contains(query,StringComparison.OrdinalIgnoreCase)).ToList();
        Chats.SelectedItem=active??conversations.FirstOrDefault();
    }
    private void CreateChat(){active=new(Guid.NewGuid().ToString(),L.T("NewTitle"),"",[],Configuration());conversations.Insert(0,active);}
    private void Chats_SelectionChanged(object sender,SelectionChangedEventArgs e)
    {
        if(Chats.SelectedItem is not Conversation chat)return;active=chat;
        if(displayedId!=chat.Id){
            displayedId=chat.Id;visibleMessages.Clear();
            foreach(var message in chat.Messages){CanvasPresentation.Normalize(message);visibleMessages.Add(message);}
        }
        Welcome.Visibility=chat.Messages.Count==0?Visibility.Visible:Visibility.Collapsed;
        ConversationTitle.Text=chat.Messages.Count==0?"Lemon":chat.Title;
        var config=chat.Configuration??new();Select(Tier,config.Tier);Select(Effort,config.Effort);Select(OutputMode,config.OutputMode);PopulateModels();
        if(visibleMessages.Count>0)Messages.ScrollIntoView(visibleMessages.Last());
    }
    private static void Select(ComboBox combo,string value){foreach(ComboBoxItem item in combo.Items)if((string)item.Tag==value)combo.SelectedItem=item;}
    private async void New_Click(object sender,RoutedEventArgs e)=>await NewChatAsync();
    private async Task NewChatAsync(){if(!storageHealthy||generation is not null)return;await SaveAsync();CreateChat();RefreshChats();if(Shell.DisplayMode==SplitViewDisplayMode.Overlay)Shell.IsPaneOpen=false;await SaveAsync();Composer.Focus(FocusState.Programmatic);}
    private async Task SaveAsync(){if(!storageHealthy)return;try{await store.SaveAsync(conversations);}catch{ShowError(L.T("SaveError"));}}
    private async void PersistCanvasState()
    {
        saveDelay?.Cancel();saveDelay=new();var token=saveDelay.Token;
        try{await Task.Delay(350,token);await SaveAsync();}catch(OperationCanceledException){ }
    }
    private async void Search_TextChanged(object sender,TextChangedEventArgs e)
    {
        if(!storageHealthy)return;searchDelay?.Cancel();searchDelay=new();var token=searchDelay.Token;var query=Search.Text;
        try{
            await Task.Delay(160,token);var snapshot=conversations.Select(chat=>(Chat:chat,Title:chat.Title,Contents:chat.Messages.Select(message=>message.Content).ToArray())).ToArray();
            var matches=await Task.Run(()=>snapshot.Where(entry=>query.Length==0||entry.Title.Contains(query,StringComparison.OrdinalIgnoreCase)||entry.Contents.Any(text=>text.Contains(query,StringComparison.OrdinalIgnoreCase))).Select(entry=>entry.Chat).ToList(),token);
            if(!token.IsCancellationRequested){Chats.ItemsSource=matches;Chats.SelectedItem=matches.Contains(active!)?active:null;}
        }catch(OperationCanceledException){ }
    }
    private void Theme_Click(object sender,RoutedEventArgs e){Root.RequestedTheme=Root.ActualTheme==ElementTheme.Dark?ElementTheme.Light:ElementTheme.Dark;settings=settings with{Theme=Root.RequestedTheme==ElementTheme.Dark?"dark":"light"};_ = SaveSettingsAsync();}
    private void Fullscreen_Click(object sender,RoutedEventArgs e)=>ToggleFullscreen();
    private void ToggleFullscreen(){if(AppWindow.Presenter.Kind==AppWindowPresenterKind.FullScreen){AppWindow.SetPresenter(windowPresenter);if(settings.Maximized&&AppWindow.Presenter is OverlappedPresenter previous)previous.Maximize();}else{settings=settings with{Maximized=AppWindow.Presenter is OverlappedPresenter current&&current.State==OverlappedPresenterState.Maximized};AppWindow.SetPresenter(AppWindowPresenterKind.FullScreen);}}
    private async Task SaveSettingsAsync()
    {
        if(!settingsHealthy){ShowError(L.T("SettingsError"));return;}
        var fullscreen=AppWindow.Presenter.Kind==AppWindowPresenterKind.FullScreen;var maximized=AppWindow.Presenter is OverlappedPresenter presenter&&presenter.State==OverlappedPresenterState.Maximized;
        var normal=!fullscreen&&!maximized;settings=settings with{Width=normal?Math.Clamp(AppWindow.Size.Width,640,7680):settings.Width,Height=normal?Math.Clamp(AppWindow.Size.Height,480,4320):settings.Height,Maximized=maximized||(fullscreen&&settings.Maximized),Fullscreen=fullscreen};
        try{await settingsStore.SaveAsync(settings);}catch{ShowError(L.T("SettingsError"));}
    }
    private async void Settings_Click(object sender,RoutedEventArgs e)
    {
        var panel=new StackPanel{Spacing=16,MinWidth=280};var language=new ComboBox{Header=L.T("Language"),HorizontalAlignment=HorizontalAlignment.Stretch};
        foreach(var (id,name) in new[]{("en","English"),("de","Deutsch"),("pl","Polski")})language.Items.Add(new ComboBoxItem{Content=name,Tag=id});
        Select(language,settings.Language);
        var response=new ComboBox{Header=L.T("ResponseLanguage"),HorizontalAlignment=HorizontalAlignment.Stretch};
        foreach(var (id,name) in new[]{("auto",L.T("Automatic")),("en","English"),("de","Deutsch"),("pl","Polski")})response.Items.Add(new ComboBoxItem{Content=name,Tag=id});Select(response,settings.ResponseLanguage);
        var localOnly=new TextBlock{Text=L.T("LocalOnly"),TextWrapping=TextWrapping.Wrap};
        var note=new TextBlock{Text=L.T("LanguageNote"),TextWrapping=TextWrapping.Wrap,FontSize=12};
        var history=new Button{Content=L.T("ReleaseNotes")};
        var showNotes=false;
        var dialog=new ContentDialog{XamlRoot=Root.XamlRoot,Title=L.T("Settings"),Content=panel,CloseButtonText=L.T("Close"),RequestedTheme=Root.ActualTheme};
        history.Click+=(_,_)=>{showNotes=true;dialog.Hide();};
        language.SelectionChanged+=(_,_)=>{settings=settings with{Language=Selection(language)};L.SetLanguage(settings.Language);dialog.Title=L.T("Settings");dialog.CloseButtonText=L.T("Close");language.Header=L.T("Language");response.Header=L.T("ResponseLanguage");note.Text=L.T("LanguageNote");localOnly.Text=L.T("LocalOnly");((ComboBoxItem)response.Items[0]).Content=L.T("Automatic");history.Content=L.T("ReleaseNotes");ConnectionLabel.Text=L.T(catalogue is null?"Offline":"Ready");Effort_SelectionChanged(Effort,null!);foreach(var message in visibleMessages)message.NotifyLanguageChanged();};
        panel.Children.Add(language);panel.Children.Add(response);panel.Children.Add(note);panel.Children.Add(localOnly);panel.Children.Add(history);panel.Children.Add(new TextBlock{Text="Lemon "+ProductConfiguration.Version,FontSize=12});
        await dialog.ShowAsync();settings=settings with{Language=Selection(language),ResponseLanguage=Selection(response)};await SaveSettingsAsync();
        if(showNotes)await ShowReleaseNotesAsync();
    }
    private async Task ShowReleaseNotesAsync()
    {
        using var source=typeof(Message).Assembly.GetManifestResourceStream("Lemon2.Core.CHANGELOG.md");
        if(source is null){ShowError(L.T("GenerationError"));return;}
        using var reader=new StreamReader(source);var content=await reader.ReadToEndAsync();
        var viewer=new MessageView{DataContext=new Message("assistant",content){OutputMode="markdown"}};
        var dialog=new ContentDialog{XamlRoot=Root.XamlRoot,Title=L.T("ReleaseNotes"),Content=new ScrollViewer{Content=viewer,MaxHeight=480,HorizontalScrollBarVisibility=ScrollBarVisibility.Disabled},CloseButtonText=L.T("Close"),RequestedTheme=Root.ActualTheme};
        await dialog.ShowAsync();
    }
    private void Stop_Click(object sender,RoutedEventArgs e)=>generation?.Cancel();
    private async void Send_Click(object sender,RoutedEventArgs e)=>await SendAsync();
    private async void Composer_KeyDown(object sender,KeyRoutedEventArgs e){var shift=Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(VirtualKey.Shift).HasFlag(CoreVirtualKeyStates.Down);if(e.Key==VirtualKey.Enter&&!shift){e.Handled=true;await SendAsync();}}
    private void ShowError(string message){ConnectButton.Visibility=catalogue is null?Visibility.Visible:Visibility.Collapsed;Status.Severity=InfoBarSeverity.Error;Status.Message=message;Status.IsOpen=true;}
    private async Task SendAsync(bool regenerate=false)
    {
        if(active is null||generation is not null||(!regenerate&&string.IsNullOrWhiteSpace(Composer.Text))||!storageHealthy)return;
        if(Model.SelectedItem is not ModelEntry selected){ShowError(L.T("ConnectError"));return;}
        var chat=active;var text=regenerate?chat.Messages.LastOrDefault(message=>message.Role=="user")?.Content??"":Composer.Text.Trim();if(text.Length==0)return;
        var config=Configuration();var updated=chat with{Model=selected.Id,Configuration=config,Title=chat.Messages.Count==0?text[..Math.Min(48,text.Length)]:chat.Title};conversations[conversations.IndexOf(chat)]=updated;active=updated;chat=updated;
        var previousReply=regenerate&&chat.Messages.LastOrDefault()?.Role=="assistant"?chat.Messages.Last():null;
        if(!regenerate){var user=new Message("user",text);chat.Messages.Add(user);visibleMessages.Add(user);}
        var history=chat.Messages.Where(message=>message!=previousReply&&(message.Content.Length>0||message.CanvasJson is not null)).ToList();
        var reply=new Message("assistant",""){OutputMode=config.OutputMode,IsStreaming=config.OutputMode!="canvas"};chat.Messages.Add(reply);visibleMessages.Add(reply);reply.StateChanged+=PersistCanvasState;Composer.Text="";
        generation=new CancellationTokenSource(TimeSpan.FromMinutes(3));SetBusy(true);Status.IsOpen=false;ConnectionLabel.Text=L.T("Generating");RefreshChats();Welcome.Visibility=Visibility.Collapsed;
        var completed=false;System.Text.StringBuilder? streamBuffer=null;
        try{
            if(config.OutputMode=="canvas"){
                var result=await service.GenerateCanvasAsync(ProductConfiguration.ApiBaseUri,selected.Id,history,config,generation.Token);reply.CanvasJson=result.CanvasJson;reply.Content=result.Content;reply.OriginalResponse=result.OriginalResponse;reply.OutputMode=result.Fallback?"markdown":"canvas";CanvasPresentation.Normalize(reply);Status.IsOpen=result.Fallback;Status.Severity=InfoBarSeverity.Warning;ConnectButton.Visibility=Visibility.Collapsed;Status.Message=L.T("CanvasFallback");
            }else{
                streamBuffer=new System.Text.StringBuilder();var update=System.Diagnostics.Stopwatch.StartNew();
                await foreach(var delta in service.StreamAsync(ProductConfiguration.ApiBaseUri,selected.Id,history,generation.Token,config)){if(streamBuffer.Length+delta.Length>1000000)throw new InvalidDataException();streamBuffer.Append(delta);if(update.ElapsedMilliseconds>=33){reply.Content=streamBuffer.ToString();update.Restart();}}
            }
            completed=true;
        }catch(OperationCanceledException){Status.Severity=InfoBarSeverity.Informational;ConnectButton.Visibility=Visibility.Collapsed;Status.Message=L.T("Stopped");Status.IsOpen=true;}
        catch{ShowError(L.T("GenerationError"));}
        finally{
            if(streamBuffer is not null)reply.Content=streamBuffer.ToString();
            reply.IsStreaming=false;
            if(reply.Content.Length==0&&reply.CanvasJson is null){chat.Messages.Remove(reply);visibleMessages.Remove(reply);}
            else if(previousReply is not null&&completed){chat.Messages.Remove(previousReply);visibleMessages.Remove(previousReply);}
            generation.Dispose();generation=null;SetBusy(false);ConnectionLabel.Text=L.T("Ready");CanvasPresentation.Normalize(reply);await SaveAsync();
            if(visibleMessages.Count>0)Messages.ScrollIntoView(visibleMessages.Last());Composer.Focus(FocusState.Programmatic);
        }
    }
    private async void Rename_Click(object sender,RoutedEventArgs e){if(active is null||generation is not null)return;var input=new TextBox{Text=active.Title,MaxLength=160};var dialog=new ContentDialog{XamlRoot=Root.XamlRoot,Title=L.T("Rename"),Content=input,PrimaryButtonText=L.T("Save"),CloseButtonText=L.T("Cancel")};if(await dialog.ShowAsync()!=ContentDialogResult.Primary||string.IsNullOrWhiteSpace(input.Text))return;var updated=active with{Title=input.Text.Trim()};conversations[conversations.IndexOf(active)]=updated;active=updated;RefreshChats();await SaveAsync();}
    private async void Delete_Click(object sender,RoutedEventArgs e){if(active is null||generation is not null)return;var dialog=new ContentDialog{XamlRoot=Root.XamlRoot,Title=L.T("DeleteConfirm"),Content=active.Title,PrimaryButtonText=L.T("Delete"),CloseButtonText=L.T("Cancel")};if(await dialog.ShowAsync()!=ContentDialogResult.Primary)return;conversations.Remove(active);active=conversations.FirstOrDefault();if(active is null)CreateChat();displayedId=null;RefreshChats();await SaveAsync();}
    private async void Regenerate_Click(object sender,RoutedEventArgs e){if(active is null||generation is not null||active.Messages.All(message=>message.Role!="user"))return;await SendAsync(true);}
    private void SetBusy(bool busy){Regenerate.IsEnabled=Search.IsEnabled=New.IsEnabled=Chats.IsEnabled=Model.IsEnabled=ConnectButton.IsEnabled=Tier.IsEnabled=Effort.IsEnabled=OutputMode.IsEnabled=!busy;Stop.IsEnabled=busy;Stop.Visibility=busy?Visibility.Visible:Visibility.Collapsed;Send.Visibility=busy?Visibility.Collapsed:Visibility.Visible;Send.IsEnabled=!busy&&catalogue is not null&&storageHealthy;}
}
