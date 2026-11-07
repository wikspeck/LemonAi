package app.lume.notebooks

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

@Entity(tableName = "records", indices = [Index("notebookId"), Index("kind")])
data class LocalRecord(@PrimaryKey val id: String, val kind: String, val notebookId: String?, val title: String, val content: String, val json: String, val revision: String, val updatedAt: String) {
    fun data() = JSONObject(json)
}
@Entity(tableName = "revisions")
data class Revision(@PrimaryKey val revision: String, val recordId: String, val json: String)

fun record(data: JSONObject): LocalRecord = LocalRecord(data.getString("id"), data.getString("kind"), data.optString("notebookId").ifBlank { null }, data.optString("title", data.optString("name", "")), data.optString("content", data.optString("text", "")), data.toString(), data.getString("revision"), data.getString("updatedAt"))
fun fresh(kind: String): JSONObject { val now = Instant.now().toString(); return JSONObject().put("id", UUID.randomUUID().toString()).put("kind", kind).put("createdAt", now).put("updatedAt", now).put("revision", UUID.randomUUID().toString()) }
fun LocalRecord.edit(title: String = this.title, content: String = this.content): LocalRecord = record(data().put("title", title).put("content", content).put("updatedAt", Instant.now().toString()).put("revision", UUID.randomUUID().toString()))

@Dao
abstract class NotebookDao {
    @Query("SELECT * FROM records ORDER BY updatedAt DESC") abstract fun observe(): Flow<List<LocalRecord>>
    @Query("SELECT * FROM records WHERE id = :id") abstract suspend fun get(id: String): LocalRecord?
    @Insert(onConflict = OnConflictStrategy.REPLACE) abstract suspend fun write(value: LocalRecord)
    @Insert(onConflict = OnConflictStrategy.IGNORE) abstract suspend fun revision(value: Revision)
    @Query("SELECT * FROM revisions WHERE recordId = :id") abstract suspend fun history(id: String): List<Revision>
    @Transaction open suspend fun save(incoming: LocalRecord, expected: String?): LocalRecord {
        val old = get(incoming.id)
        val next = if (old != null && old.revision != expected && old.revision != incoming.revision) record(incoming.data().put("id", UUID.randomUUID().toString()).put("title", incoming.title + " (conflict copy)")) else incoming
        if (old != null) revision(Revision(old.revision, old.id, old.json))
        write(next)
        return next
    }
}
@Database(entities = [LocalRecord::class, Revision::class], version = 1, exportSchema = true)
abstract class NotebookDatabase: RoomDatabase() { abstract fun records(): NotebookDao }
