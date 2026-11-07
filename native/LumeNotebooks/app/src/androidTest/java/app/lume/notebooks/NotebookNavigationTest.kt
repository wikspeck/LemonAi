package app.lume.notebooks

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import org.junit.Rule
import org.junit.Test

class NotebookNavigationTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    @Test fun createNotebookEditAndReopenOfflineNote() {
        val name = "Offline notebook ${System.currentTimeMillis()}"
        compose.onNodeWithText("+ New notebook").performClick()
        compose.onNodeWithText("Name").performTextInput(name)
        compose.onNodeWithText("Create", useUnmergedTree = true).performClick()
        compose.waitUntil(10000) { compose.onAllNodesWithText("+ Note").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("+ Note").performClick()
        compose.waitUntil(10000) { compose.onAllNodesWithText("Note title").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Note title").performTextReplacement("Stored offline")
        compose.onNodeWithText("Write a little thought… Markdown supported.").performTextInput("A native note survives navigation without a network.")
        compose.waitForIdle()
        compose.onNodeWithText("← Notes").performClick()
        compose.waitUntil(10000) { compose.onAllNodesWithText("Stored offline").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Stored offline").performClick()
        compose.onNodeWithText("A native note survives navigation without a network.").assertIsDisplayed()
        compose.activityRule.scenario.recreate()
        compose.waitForIdle()
        compose.onNodeWithText("A native note survives navigation without a network.").assertExists()
    }
}
