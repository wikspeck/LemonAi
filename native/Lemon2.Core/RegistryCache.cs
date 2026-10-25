using System.Text.Json;
namespace Lemon2;
public sealed class RegistryCache(Uri origin)
{
    private readonly string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Lemon2", "models-"+Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(origin.AbsoluteUri)))[..12]+".json");
    public async Task<ModelCatalogue?> LoadAsync()
    {
        try { if(!File.Exists(path)||DateTime.UtcNow-File.GetLastWriteTimeUtc(path)>TimeSpan.FromMinutes(30))return null; var model=JsonSerializer.Deserialize<ModelCatalogue>(await File.ReadAllTextAsync(path)); return model?.Version==2 && model.Models is { Count: >0 and <=100 } && model.TierDefaults is not null ? model : null; }
        catch { return null; }
    }
    public async Task SaveAsync(ModelCatalogue catalogue) { Directory.CreateDirectory(Path.GetDirectoryName(path)!);await File.WriteAllTextAsync(path+".tmp",JsonSerializer.Serialize(catalogue));File.Move(path+".tmp",path,true); }
}
