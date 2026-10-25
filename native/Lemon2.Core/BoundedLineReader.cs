using System.Text;
namespace Lemon2;
internal sealed class BoundedLineReader(StreamReader reader, int maximum = 1000000)
{
    private readonly char[] buffer = new char[4096];
    private int offset, count;
    public async Task<string?> ReadLineAsync(CancellationToken token)
    {
        var line = new StringBuilder();
        while (true)
        {
            if (offset == count) { count = await reader.ReadAsync(buffer.AsMemory(), token); offset = 0; if (count == 0) return line.Length == 0 ? null : line.ToString().TrimEnd('\r'); }
            var end = Array.IndexOf(buffer, '\n', offset, count - offset);
            var length = (end < 0 ? count : end) - offset;
            if (line.Length + length > maximum) throw new InvalidDataException("Stream event exceeds the size limit.");
            line.Append(buffer, offset, length); offset += length;
            if (end >= 0) { offset++; return line.ToString().TrimEnd('\r'); }
        }
    }
}
