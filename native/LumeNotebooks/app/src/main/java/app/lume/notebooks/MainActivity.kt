package app.lume.notebooks

import android.app.Application
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.viewModels
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.*
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity: ComponentActivity() {
    private val model: NotebookViewModel by viewModels()
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { LumeApp(model) }; if (intent.action == Intent.ACTION_SEND) model.receive(intent) }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); model.receive(intent) }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun LumeApp(vm: NotebookViewModel) {
    val records by vm.records.collectAsStateWithLifecycle()
    val status by vm.status.collectAsStateWithLifecycle()
    val problem by vm.problem.collectAsStateWithLifecycle()
    val draft by vm.aiDraft.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()
    val preferences = LocalContext.current.getSharedPreferences("lume-settings", 0)
    var dark by rememberSaveable { mutableStateOf(preferences.getBoolean("dark", false)) }
    LaunchedEffect(dark) { preferences.edit().putBoolean("dark", dark).apply() }
    var query by rememberSaveable { mutableStateOf("") }
    var create by remember { mutableStateOf(false) }
    var createName by remember { mutableStateOf("") }
    var sectionBook by remember { mutableStateOf<String?>(null) }
    var aiBook by remember { mutableStateOf<String?>(null) }
    var aiNote by remember { mutableStateOf<LocalRecord?>(null) }
    var aiSelection by remember { mutableStateOf(TextRange.Zero) }
    var aiPrompt by rememberSaveable { mutableStateOf("") }
    var model by rememberSaveable { mutableStateOf(preferences.getString("model", "auto") ?: "auto") }
    LaunchedEffect(model) { preferences.edit().putString("model", model).apply() }
    var importBook by remember { mutableStateOf<String?>(null) }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> if (uri != null && importBook != null) vm.importDocument(uri, importBook!!) }
    val backup = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri -> if (uri != null) vm.exportBackup(uri) }
    MaterialTheme(colorScheme = if (dark) darkColorScheme(primary = Color(0xFFB1C59B)) else lightColorScheme(primary = Color(0xFF344F3D), background = Color(0xFFFAFBF8), surface = Color(0xFFF2F4EE))) {
        Scaffold(topBar = { TopAppBar(title = { Text("✧ lume notebooks") }, actions = { TextButton(onClick = { dark = !dark }) { Text(if (dark) "Light" else "Dark") }; TextButton(onClick = { backup.launch("lume-backup.json") }) { Text("Backup") } }) }, bottomBar = { Surface { Text(status, Modifier.fillMaxWidth().padding(12.dp), style = MaterialTheme.typography.labelSmall) } }) { padding ->
            NavHost(navController = nav, startDestination = "home", modifier = Modifier.padding(padding)) {
                composable("home") {
                    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        item { Spacer(Modifier.height(10.dp)); Text("Good ideas start here.", style = MaterialTheme.typography.headlineLarge); Text("Your notes, sources, and the ideas in between.", style = MaterialTheme.typography.bodyMedium); Spacer(Modifier.height(12.dp)); Button(onClick = { create = true }) { Text("+ New notebook") } }
                        item { OutlinedTextField(value = query, onValueChange = { query = it }, label = { Text("Search all notebooks and notes") }, modifier = Modifier.fillMaxWidth()) }
                        items(records.filter { it.kind == "notebook" && it.title.contains(query, true) }, key = { it.id }) { b -> Card(onClick = { nav.navigate("book/${b.id}") }, modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(22.dp)) { Text("✳", style = MaterialTheme.typography.headlineLarge); Spacer(Modifier.height(12.dp)); Text(b.title, style = MaterialTheme.typography.titleLarge); Text("${records.count { it.kind == "note" && it.notebookId == b.id }} notes · stored on your device", style = MaterialTheme.typography.bodySmall) } } }
                        item { Text(if (query.isBlank()) "Recent notes" else "Matching notes", style = MaterialTheme.typography.titleMedium) }
                        items(records.filter { it.kind == "note" && (it.title.contains(query, true) || it.content.contains(query, true)) }.take(50), key = { it.id }) { n -> ListItem(headlineContent = { Text(n.title) }, supportingContent = { Text(n.content.take(80), maxLines = 2) }, modifier = Modifier.clickable { nav.navigate("note/${n.id}") }) }
                        item { Text("Notes stay on this device. Cloud sync is not enabled. Export backups regularly.", style = MaterialTheme.typography.bodySmall); Spacer(Modifier.height(20.dp)) }
                    }
                }
                composable("book/{id}") { entry ->
                    val id = entry.arguments?.getString("id")!!
                    val book = records.find { it.id == id }
                    var filter by rememberSaveable(id) { mutableStateOf<String?>(null) }
                    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item { TextButton(onClick = { nav.popBackStack() }) { Text("← All notebooks") }; Text(book?.title ?: "Notebook", style = MaterialTheme.typography.headlineLarge) }
                        item { FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button(onClick = { val nid = vm.note(id, section = filter); scope.launch { vm.records.filter { values -> values.any { it.id == nid } }.first(); nav.navigate("note/$nid") } }) { Text("+ Note") }; OutlinedButton(onClick = { importBook = id; importer.launch(arrayOf("text/*", "application/pdf", "image/*")) }, enabled = !busy) { Text("Import source") }; OutlinedButton(onClick = { aiBook = id; aiNote = null }) { Text("Ask Lume") }; TextButton(onClick = { sectionBook = id; createName = "" }) { Text("+ Section") } } }
                        item { FlowRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) { FilterChip(selected = filter == null, onClick = { filter = null }, label = { Text("All notes") }); records.filter { it.kind == "section" && it.notebookId == id }.forEach { s -> FilterChip(selected = filter == s.id, onClick = { filter = s.id }, label = { Text(s.title) }) } } }
                        items(records.filter { it.kind == "note" && it.notebookId == id && (filter == null || it.data().optString("sectionId") == filter) }, key = { it.id }) { n -> Card(onClick = { nav.navigate("note/${n.id}") }, modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(18.dp)) { Text(n.title, style = MaterialTheme.typography.titleMedium); Text(n.content.take(140), maxLines = 3, style = MaterialTheme.typography.bodySmall) } } }
                        item { Text("Sources", style = MaterialTheme.typography.titleLarge) }
                        items(records.filter { it.kind == "attachment" && it.notebookId == id }, key = { it.id }) { a -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(a.title, style = MaterialTheme.typography.titleMedium); SelectionContainer { Text(a.content.take(1500).ifBlank { "Original file stored locally; no text extracted." }, style = MaterialTheme.typography.bodySmall) } } } }
                        item { Text("Study studio", style = MaterialTheme.typography.titleLarge) }
                        items(records.filter { it.notebookId == id && it.kind in listOf("flashcard", "quiz") }, key = { it.id }) { study ->
                            var revealed by rememberSaveable(study.id) { mutableStateOf(false) }
                            var answer by rememberSaveable(study.id) { mutableStateOf(-1) }
                            val data = study.data()
                            Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(data.getString("question"), style = MaterialTheme.typography.titleMedium)
                                if (study.kind == "flashcard") { if (revealed) Text(data.getString("answer")); TextButton(onClick = { revealed = !revealed }) { Text(if (revealed) "Hide answer" else "Show answer") } }
                                else { val options = data.getJSONArray("options"); for (i in 0 until options.length()) { OutlinedButton(onClick = { answer = i }) { Text(options.getString(i)) } }; if (answer >= 0) Text((if (answer == data.getInt("answer")) "Correct. " else "Correct answer: ${options.getString(data.getInt("answer"))}. ") + data.getString("explanation")) }
                            } }
                        }
                    }
                }
                composable("note/{id}") { entry ->
                    val id = entry.arguments?.getString("id")!!
                    val n = records.find { it.id == id }
                    var local by remember(id) { mutableStateOf(n) }
                    var title by rememberSaveable(id) { mutableStateOf(n?.title ?: "") }
                    var content by rememberSaveable(id, stateSaver = TextFieldValue.Saver) { mutableStateOf(TextFieldValue(n?.content ?: "")) }
                    LaunchedEffect(n?.id) { if (local == null && n != null) { local = n; title = n.title; content = TextFieldValue(n.content) } }
                    fun write(t: String, c: TextFieldValue) { val old = local ?: return; title = t; content = c; val next = old.edit(title = t, content = c.text); local = next; vm.save(next, old.revision) }
                    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { TextButton(onClick = { nav.popBackStack() }) { Text("← Notes") }; TextButton(onClick = { if (n != null) { aiBook = n.notebookId; aiNote = local; aiSelection = content.selection } }) { Text("✧ Ask Lume") }; TextButton(onClick = { if (n != null) vm.restoreNote(n.id) }) { Text("Restore copy") }; TextButton(onClick = { val context = vm.getApplication<Application>(); val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, content.text); context.startActivity(Intent.createChooser(send, "Share note").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }) { Text("Share") } }
                        OutlinedTextField(value = title, onValueChange = { write(it, content) }, label = { Text("Note title") }, modifier = Modifier.fillMaxWidth())
                        FlowRow { TextButton(onClick = { val a = content.selection.min; val b = content.selection.max; write(title, TextFieldValue(content.text.replaceRange(a, b, "**${content.text.substring(a, b)}**"), TextRange(a + 2, b + 2))) }) { Text("Bold") }; TextButton(onClick = { write(title, TextFieldValue(content.text + "\n## ")) }) { Text("Heading") }; TextButton(onClick = { write(title, TextFieldValue(content.text + "\n- [ ] ")) }) { Text("Checklist") } }
                        OutlinedTextField(value = content, onValueChange = { write(title, it) }, placeholder = { Text("Write a little thought… Markdown supported.") }, modifier = Modifier.fillMaxWidth().weight(1f))
                        Text("Markdown editor · revisions kept · select text before asking for a rewrite", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(vertical = 10.dp))
                    }
                }
            }
        }
        if (create || sectionBook != null) AlertDialog(onDismissRequest = { create = false; sectionBook = null }, title = { Text(if (create) "A new space for ideas" else "New section") }, text = { OutlinedTextField(value = createName, onValueChange = { createName = it }, label = { Text("Name") }) }, confirmButton = { TextButton(enabled = createName.isNotBlank(), onClick = { if (create) { val id = vm.notebook(createName.trim()); scope.launch { vm.records.filter { rows -> rows.any { it.id == id } }.first(); nav.navigate("book/$id") } } else vm.section(sectionBook!!, createName.trim()); create = false; sectionBook = null; createName = "" }) { Text("Create") } }, dismissButton = { TextButton(onClick = { create = false; sectionBook = null }) { Text("Cancel") } })
        if (problem != null) AlertDialog(onDismissRequest = { vm.problem.value = null }, title = { Text("Lume needs your attention") }, text = { Text(problem!!) }, confirmButton = { TextButton(onClick = { vm.problem.value = null }) { Text("OK") } })
        if (aiBook != null) ModalBottomSheet(onDismissRequest = { if (!busy) aiBook = null }) {
            LazyColumn(Modifier.fillMaxWidth().padding(20.dp).imePadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { Text("A little help from Lume", style = MaterialTheme.typography.headlineSmall); Text("Relevant excerpts are sent to Cloudflare AI only when you choose an action. Original notes are never replaced automatically.", style = MaterialTheme.typography.bodySmall) }
                item { FlowRow { listOf("auto", "llama", "deepseek").forEach { m -> FilterChip(selected = model == m, onClick = { model = m }, label = { Text(m) }, modifier = Modifier.padding(end = 7.dp)) } } }
                item { OutlinedTextField(value = aiPrompt, onValueChange = { aiPrompt = it }, label = { Text("Question, topic, or rewrite instruction") }, modifier = Modifier.fillMaxWidth()) }
                item { FlowRow { listOf("chat", "generate", "summarize", "structure", "explain", "flashcards", "quiz", "connections", "rewrite").forEach { action -> TextButton(enabled = !busy && (action != "rewrite" || !aiSelection.collapsed), onClick = { val text = aiNote?.content ?: ""; val a = aiSelection.min.coerceIn(0, text.length); val b = aiSelection.max.coerceIn(a, text.length); vm.ask(aiBook!!, aiNote, aiPrompt.ifBlank { action }, action, model, if (action == "rewrite") text.substring(a, b) else "", a, b) }) { Text(action) } } } }
                if (busy) item { LinearProgressIndicator(Modifier.fillMaxWidth()); Text("Lume is thinking…") }
                draft?.let { d -> item { Text("Review before inserting", style = MaterialTheme.typography.titleMedium); SelectionContainer { Text(d.getString("content")) }; d.optJSONArray("sources")?.let { src -> for (i in 0 until src.length()) { val s = src.getJSONObject(i); Text("[${i + 1}] ${s.getString("title")}\n${s.getString("excerpt")}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 10.dp)) } }; Button(onClick = { vm.acceptDraft(); aiBook = null }) { Text(if (d.getString("action") == "rewrite") "Confirm selection replacement" else "Create note from this draft") }; TextButton(onClick = { vm.aiDraft.value = null }) { Text("Dismiss draft") } } }
                item { Spacer(Modifier.height(25.dp)) }
            }
        }
    }
}
