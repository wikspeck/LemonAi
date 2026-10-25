using System.Text.Json;
namespace Lemon2;
public static class ApiRequest
{
    public static string Serialize(string model, IEnumerable<Message> messages, GenerationConfig? configuration, bool stream)
    {
        var body=new Dictionary<string,object>{["messages"]=messages.Select(message=>new{role=message.Role,content=message.CanvasJson??message.Content}).ToArray()};
        if(configuration is null)body["model"]=model;
        else {
            body["engine"]="lemon2";body["modelId"]=model;body["tier"]=configuration.Tier;body["effort"]=configuration.Effort;body["outputMode"]=configuration.OutputMode;body["stream"]=stream;
            if(configuration.ResponseLanguage is "en" or "de" or "pl")body["responseLanguage"]=configuration.ResponseLanguage;
        }
        return JsonSerializer.Serialize(body);
    }
}
