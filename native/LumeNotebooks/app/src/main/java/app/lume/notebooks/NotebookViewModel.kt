package app.lume.notebooks

import android.app.Application
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.room.Room
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.tasks.await
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import android.graphics.BitmapFactory
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

class NotebookViewModel(app: Application): AndroidViewModel(app) {
    private val db = Room.databaseBuilder(app, NotebookDatabase::class.java, "lume-notebooks.db").build()
    val records = db.records().observe().stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())
    val status = MutableStateFlow("Saved on this device")
    val problem = MutableStateFlow<String?>(null)
    val aiDraft = MutableStateFlow<JSONObject?>(null)
    val busy = MutableStateFlow(false)
    private val writes = Channel<Pair<LocalRecord, String?>>(Channel.UNLIMITED)
    init { viewModelScope.launch { for ((record, revision) in writes) { try { val saved = db.records().save(record, revision); status.value = if (saved.id != record.id) "Conflict copy saved; both versions kept" else "Saved on this device" } catch (e: Exception) { status.value = "Save failed — keep the app open"; problem.value = e.message } } } }
    fun save(value: LocalRecord, expected: String? = null) { status.value = "Saving…"; writes.trySend(value to expected) }
    fun notebook(title: String): String { val b = fresh("notebook").put("title", title).put("description", "A new space for your ideas").put("color", "sage").put("icon", "✳").put("starred", false); save(record(b)); return b.getString("id") }
    fun note(book: String, title: String = "Untitled note", text: String = "", section: String? = null): String { val n = fresh("note").put("notebookId", book).put("sectionId", section ?: JSONObject.NULL).put("title", title).put("content", text).put("tags", JSONArray()).put("sourceIds", JSONArray()).put("starred", false); save(record(n)); return n.getString("id") }
    fun section(book: String, name: String, parent: String? = null) { save(record(fresh("section").put("notebookId", book).put("title", name).put("parentId", parent ?: JSONObject.NULL))) }
    fun restoreNote(id: String) { viewModelScope.launch { val previous = db.records().history(id).lastOrNull(); if (previous == null) problem.value = "No previous revision yet" else { val r = record(JSONObject(previous.json)); note(r.notebookId!!, r.title + " (restored)", r.content); status.value = "Previous revision restored as a new note" } } }
    fun importDocument(uri: Uri, book: String) {
        viewModelScope.launch {
            busy.value = true
            try {
                val attachment = withContext(Dispatchers.IO) {
                    val resolver = getApplication<Application>().contentResolver
                    val name = resolver.query(uri, null, null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(c.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME)) else "Imported source" } ?: "Imported source"
                    val bytes = resolver.openInputStream(uri)!!.use { input ->
                        val output = java.io.ByteArrayOutputStream()
                        val buffer = ByteArray(8192)
                        while (true) { val count = input.read(buffer); if (count < 0) break; require(output.size() + count <= 20 * 1024 * 1024) { "Choose a file smaller than 20 MB" }; output.write(buffer, 0, count) }
                        output.toByteArray()
                    }
                    require(bytes.size <= 20 * 1024 * 1024) { "Choose a file smaller than 20 MB" }
                    val mime = resolver.getType(uri) ?: "application/octet-stream"
                    val text = when {
                        mime == "application/pdf" || name.endsWith(".pdf", true) -> { PDFBoxResourceLoader.init(getApplication()); PDDocument.load(bytes).use { pdf -> require(pdf.numberOfPages <= 300) { "Split PDFs longer than 300 pages" }; PDFTextStripper().getText(pdf).take(2_000_000) } }
                        mime.startsWith("image/") -> {
                            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                            var sample = 1
                            while (bounds.outWidth / sample > 2048 || bounds.outHeight / sample > 2048) sample *= 2
                            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample }) ?: error("Unsupported image")
                            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                            try { recognizer.process(InputImage.fromBitmap(bitmap, 0)).await().text.take(2_000_000) } finally { recognizer.close(); bitmap.recycle() }
                        }
                        mime.startsWith("text/") || name.endsWith(".md") -> bytes.toString(Charsets.UTF_8).take(2_000_000)
                        else -> error("Supported files: PDF, text, Markdown, and images")
                    }
                    val json = fresh("attachment").put("notebookId", book).put("name", name).put("mime", mime).put("size", bytes.size).put("text", text)
                    val directory = java.io.File(getApplication<Application>().filesDir, "sources").apply { mkdirs() }
                    java.io.File(directory, json.getString("id")).writeBytes(bytes)
                    record(json)
                }
                save(attachment)
                status.value = if (attachment.content.isBlank()) "Source saved; no readable text found. Scanned PDFs need page-image imports." else "Source imported on this device"
            } catch (e: Exception) { problem.value = e.message ?: "Import failed" } finally { busy.value = false }
        }
    }
    fun receive(intent: Intent) { if (intent.action == Intent.ACTION_SEND) { val inbox = records.value.firstOrNull { it.kind == "notebook" && it.title == "Shared with Lume" }?.id ?: notebook("Shared with Lume"); val text = intent.getStringExtra(Intent.EXTRA_TEXT); if (!text.isNullOrBlank()) note(inbox, intent.getStringExtra(Intent.EXTRA_SUBJECT) ?: "Shared note", text); @Suppress("DEPRECATION") val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM); if (uri != null) importDocument(uri, inbox) } }
    fun ask(book: String, note: LocalRecord?, prompt: String, action: String, model: String, selection: String = "", start: Int = 0, end: Int = 0) {
        if (busy.value) return
        viewModelScope.launch {
            busy.value = true; aiDraft.value = null
            try {
                val result = withContext(Dispatchers.IO) {
                    val terms = prompt.lowercase().split(Regex("\\W+")).filter { it.length > 2 }
                    val chunks = records.value.filter { it.notebookId == book && (it.kind == "note" || it.kind == "attachment") }.flatMap { r -> r.content.chunked(1200).mapIndexed { index, text -> JSONObject().put("id", "${r.id}:$index").put("title", r.title).put("excerpt", text) } }.sortedByDescending { chunk -> terms.count { chunk.getString("excerpt").lowercase().contains(it) } }.take(8)
                    val body = JSONObject().put("action", action).put("model", model).put("language", "en").put("prompt", prompt).put("selection", selection).put("sources", JSONArray(chunks)).put("history", JSONArray())
                    val connection = URL(BuildConfig.API_BASE + "/api/notebooks/ai").openConnection() as HttpURLConnection
                    connection.requestMethod = "POST"; connection.connectTimeout = 20000; connection.readTimeout = 180000; connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json")
                    try { connection.outputStream.use { it.write(body.toString().toByteArray()) }; val success = connection.responseCode in 200..299; val response = (if (success) connection.inputStream else connection.errorStream).bufferedReader().use { it.readText() }; val json = JSONObject(response); if (!success) error(json.optString("error", "AI unavailable")); json.put("action", action).put("notebookId", book).put("noteId", note?.id).put("revision", note?.revision).put("selection", selection).put("start", start).put("end", end) } finally { connection.disconnect() }
                }
                aiDraft.value = result
                val messages = JSONArray().put(JSONObject().put("role", "user").put("content", prompt)).put(JSONObject().put("role", "assistant").put("content", result.getString("content")).put("sources", result.optJSONArray("sources") ?: JSONArray()))
                save(record(fresh("conversation").put("notebookId", book).put("noteId", note?.id ?: JSONObject.NULL).put("messages", messages)))
            } catch (e: Exception) { problem.value = e.message ?: "AI unavailable. Your notes are unchanged." } finally { busy.value = false }
        }
    }
    fun acceptDraft() {
        val d = aiDraft.value ?: return
        if (d.getString("action") == "rewrite") {
            val target = records.value.find { it.id == d.optString("noteId") }
            if (target == null || target.revision != d.optString("revision")) { problem.value = "The note changed. Select the text again; nothing was replaced."; return }
            val a = d.getInt("start"); val b = d.getInt("end")
            if (target.content.substring(a, b) != d.getString("selection")) { problem.value = "Selection changed; nothing was replaced"; return }
            save(target.edit(content = target.content.replaceRange(a, b, d.getString("content"))), target.revision)
        } else if (d.getString("action") in listOf("flashcards", "quiz")) {
            try {
                val items = JSONArray(d.getString("content").replace(Regex("^```(?:json)?\\s*|\\s*```$"), ""))
                require(items.length() in 1..20)
                val prepared = (0 until items.length()).map { index ->
                    val item = items.getJSONObject(index)
                    require(item.getString("question").length <= 4000)
                    val json = fresh(if (d.getString("action") == "flashcards") "flashcard" else "quiz").put("notebookId", d.getString("notebookId")).put("question", item.getString("question"))
                    if (d.getString("action") == "flashcards") json.put("answer", item.getString("answer"))
                    else { val options = item.getJSONArray("options"); val answer = item.getInt("answer"); require(options.length() in 2..6 && answer in 0 until options.length()); json.put("options", options).put("answer", answer).put("explanation", item.getString("explanation")) }
                    record(json)
                }
                prepared.forEach { save(it) }
            } catch (e: Exception) { problem.value = "Invalid study data. Retry or keep the answer as text."; return }
        } else note(d.getString("notebookId"), "AI draft", d.getString("content"))
        aiDraft.value = null
    }
    fun exportBackup(uri: Uri) {
        viewModelScope.launch(Dispatchers.IO) {
            try { val files = JSONObject(); records.value.filter { it.kind == "attachment" }.forEach { r -> val f = java.io.File(getApplication<Application>().filesDir, "sources/${r.id}"); if (f.exists()) files.put(r.id, "data:${r.data().optString("mime")};base64," + android.util.Base64.encodeToString(f.readBytes(), android.util.Base64.NO_WRAP)) }; val root = JSONObject().put("version", 1).put("records", JSONArray(records.value.map { it.data() })).put("files", files); getApplication<Application>().contentResolver.openOutputStream(uri)!!.use { it.write(root.toString().toByteArray()) }; status.value = "Backup exported" } catch (e: Exception) { problem.value = e.message }
        }
    }
}
