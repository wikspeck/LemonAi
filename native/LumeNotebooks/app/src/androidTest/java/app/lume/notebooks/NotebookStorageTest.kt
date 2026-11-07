package app.lume.notebooks

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONArray

@RunWith(AndroidJUnit4::class)
class NotebookStorageTest {
    @Test fun offlineWriteAndConflictPreserveBothVersions() = runBlocking {
        val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), NotebookDatabase::class.java).build()
        try {
            val dao = db.records()
            val n = record(fresh("note").put("notebookId", "book").put("title", "Original").put("content", "Offline text").put("tags", JSONArray()).put("sourceIds", JSONArray()))
            dao.save(n, null)
            val first = n.edit(content = "First writer")
            dao.save(first, n.revision)
            val stale = n.edit(content = "Stale writer")
            val copy = dao.save(stale, n.revision)
            assertNotEquals(n.id, copy.id)
            assertEquals("First writer", dao.get(n.id)!!.content)
            assertEquals("Stale writer", dao.get(copy.id)!!.content)
            assertTrue(dao.history(n.id).isNotEmpty())
        } finally { db.close() }
    }
}
